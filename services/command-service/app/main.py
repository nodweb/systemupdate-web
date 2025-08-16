import os
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime, timezone
import uuid
import httpx

app = FastAPI(title="Command Service", version="0.3.0")

# OpenTelemetry init (no-op if not configured via env), with safe tracer fallback
try:
    from .otel import init_tracing  # local helper sets provider + FastAPI instrumentation
    from opentelemetry import trace
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

    init_tracing(service_name="command-service", app=app)
    tracer = trace.get_tracer(__name__)
    try:
        HTTPXClientInstrumentor().instrument()
    except Exception:
        pass
except Exception:
    class _Noop:
        def __enter__(self):
            return self
        def __exit__(self, *args):
            return False
    class _Tracer:
        def start_as_current_span(self, name):
            return _Noop()
    tracer = _Tracer()


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


class CommandCreate(BaseModel):
    device_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    payload: Dict | None = None


class Command(BaseModel):
    id: str
    device_id: str
    name: str
    payload: Dict | None = None
    created_at: str
    status: str = "queued"


# naive in-memory store for M0
COMMANDS: Dict[str, Command] = {}
OUTBOX: asyncio.Queue = asyncio.Queue()
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")
KAFKA_TOPIC = os.getenv("COMMAND_EVENTS_TOPIC", "command.events")
publisher_task: asyncio.Task | None = None
DB_DSN: Optional[str] = None  # set when DB is initialized

try:
    from aiokafka import AIOKafkaProducer
except Exception:
    AIOKafkaProducer = None  # type: ignore

try:
    import psycopg
    from psycopg.rows import dict_row
except Exception:
    psycopg = None  # type: ignore


@app.post("/commands", response_model=Command, status_code=201)
async def create_command(body: CommandCreate):
    with tracer.start_as_current_span("create_command"):
        cid = f"cmd-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        cmd = Command(id=cid, device_id=body.device_id, name=body.name, payload=body.payload, created_at=now)
        # persist if DB available, else in-memory fallback
        if DB_DSN is not None and psycopg is not None:
            async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
                async with aconn.cursor() as cur:
                    await cur.execute(
                        """
                        insert into commands(id, device_id, name, payload, created_at, status)
                        values (%s, %s, %s, %s, %s, %s)
                        on conflict (id) do nothing
                        """,
                        (cid, body.device_id, body.name, body.payload, now, "queued"),
                    )
                    await cur.execute(
                        """
                        insert into outbox(kind, aggregate_id, payload)
                        values (%s, %s, %s)
                        """,
                        ("command.created", cid, {"id": cid, "device_id": body.device_id, "name": body.name, "payload": body.payload, "created_at": now}),
                    )
                    await aconn.commit()
        else:
            COMMANDS[cid] = cmd
            await OUTBOX.put({
                "type": "command.created",
                "id": cid,
                "device_id": body.device_id,
                "name": body.name,
                "payload": body.payload,
                "created_at": now,
            })
        return cmd


@app.get("/commands", response_model=List[Command])
async def list_commands():
    with tracer.start_as_current_span("list_commands"):
        if DB_DSN is not None and psycopg is not None:
            async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
                async with aconn.cursor(row_factory=dict_row) as cur:
                    await cur.execute("select id, device_id, name, payload, created_at, status from commands order by created_at desc limit 200")
                    rows = await cur.fetchall()
                    return rows
        return list(COMMANDS.values())


@app.get("/commands/{command_id}", response_model=Command)
async def get_command(command_id: str):
    with tracer.start_as_current_span("get_command"):
        if DB_DSN is not None and psycopg is not None:
            async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
                async with aconn.cursor(row_factory=dict_row) as cur:
                    await cur.execute("select id, device_id, name, payload, created_at, status from commands where id=%s", (command_id,))
                    row = await cur.fetchone()
                    if not row:
                        raise HTTPException(status_code=404, detail="command not found")
                    return row
        cmd = COMMANDS.get(command_id)
        if not cmd:
            raise HTTPException(status_code=404, detail="command not found")
        return cmd


@app.get("/example/commands")
async def list_example_commands():
    return {
        "items": [
            {"id": "cmd-1", "device_id": "dev-001", "name": "reboot", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "cmd-2", "device_id": "dev-002", "name": "install_update", "created_at": "2024-01-02T00:00:00Z"},
        ]
    }


@app.get("/demo/downstream")
async def demo_downstream(device_id: str = "dev-001"):
    """
    Part of the demo e2e trace: command-service calls device-service.
    """
    with tracer.start_as_current_span("command.demo_downstream"):
        url = "http://device-service:8003/demo/leaf"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url, params={"device_id": device_id})
            r.raise_for_status()
            return r.json()


async def _publisher() -> None:
    # two modes: DB-backed outbox, or in-memory fallback
    if DB_DSN is not None and psycopg is not None:
        # DB mode - poll table
        producer: Optional[AIOKafkaProducer] = None
        try:
            if AIOKafkaProducer is not None:
                loop = asyncio.get_event_loop()
                producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP, loop=loop)
                await producer.start()
            while True:
                # fetch one pending
                async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
                    async with aconn.cursor(row_factory=dict_row) as cur:
                        await cur.execute("select id, kind, payload from outbox where sent_at is null order by id asc limit 1 for update skip locked")
                        row = await cur.fetchone()
                        if not row:
                            await asyncio.sleep(0.5)
                            continue
                        try:
                            if producer is not None:
                                await producer.send_and_wait(KAFKA_TOPIC, str(row["payload"]).encode("utf-8"))
                            await cur.execute("update outbox set sent_at = now() where id=%s", (row["id"],))
                            await aconn.commit()
                        except Exception:
                            await aconn.rollback()
        finally:
            if producer is not None:
                await producer.stop()
    else:
        # In-memory mode
        if AIOKafkaProducer is None:
            while True:
                await OUTBOX.get()
                OUTBOX.task_done()
            return
        producer: Optional[AIOKafkaProducer] = None
        try:
            loop = asyncio.get_event_loop()
            producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP, loop=loop)
            await producer.start()
            while True:
                event = await OUTBOX.get()
                try:
                    await producer.send_and_wait(KAFKA_TOPIC, str(event).encode("utf-8"))
                finally:
                    OUTBOX.task_done()
        finally:
            if producer is not None:
                await producer.stop()


@app.on_event("startup")
async def on_startup() -> None:
    global publisher_task
    # ensure tables
    await _maybe_init_db()
    publisher_task = asyncio.create_task(_publisher())


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global publisher_task
    if publisher_task is not None:
        publisher_task.cancel()
        try:
            await publisher_task
        except asyncio.CancelledError:
            pass
        publisher_task = None


async def _maybe_init_db() -> None:
    """Initialize DB DSN and ensure tables if Postgres env is configured and psycopg is available."""
    global DB_DSN
    if psycopg is None:
        return
    dsn = os.getenv("POSTGRES_DSN") or _dsn_from_env()
    if not dsn:
        return
    DB_DSN = dsn
    # ensure tables exist
    async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
        async with aconn.cursor() as cur:
            await cur.execute(
                """
                create table if not exists commands(
                  id text primary key,
                  device_id text not null,
                  name text not null,
                  payload jsonb,
                  created_at timestamptz not null,
                  status text not null
                );
                """
            )
            await cur.execute(
                """
                create table if not exists outbox(
                  id bigserial primary key,
                  kind text not null,
                  aggregate_id text not null,
                  payload jsonb not null,
                  created_at timestamptz not null default now(),
                  sent_at timestamptz
                );
                """
            )
            await aconn.commit()


def _dsn_from_env() -> Optional[str]:
    host = os.getenv("POSTGRES_HOST")
    if not host:
        return None
    user = os.getenv("POSTGRES_USER", "systemupdate")
    pwd = os.getenv("POSTGRES_PASSWORD", "systemupdate")
    db = os.getenv("POSTGRES_DB", "systemupdate")
    port = os.getenv("POSTGRES_PORT", "5432")
    return f"postgresql://{user}:{pwd}@{host}:{port}/{db}"
