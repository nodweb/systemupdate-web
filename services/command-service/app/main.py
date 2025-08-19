import asyncio
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, TypedDict

from fastapi import (Depends, FastAPI, Header, HTTPException, Request,
                     Response, status)

# Safe import for shared authorize client despite hyphen in directory name
try:
    # Try an alternate, underscore-style package if available
    from libs.shared_python.security.authorize_client import \
      authorize as auth_authorize
    from libs.shared_python.security.authorize_client import \
      introspect as auth_introspect  # type: ignore
except Exception:
    import importlib.util
    import pathlib
    import sys

    _root = pathlib.Path(__file__).resolve().parents[3]
    _ac_path = _root / "libs" / "shared-python" / "security" / "authorize_client.py"
    spec = importlib.util.spec_from_file_location("_authorize_client", _ac_path)
    if spec and spec.loader:
        _mod = importlib.util.module_from_spec(spec)
        sys.modules["_authorize_client"] = _mod
        spec.loader.exec_module(_mod)
        auth_introspect = getattr(_mod, "introspect")  # type: ignore
        auth_authorize = getattr(_mod, "authorize")  # type: ignore
    else:  # pragma: no cover
        raise ImportError("Unable to load authorize_client helper")
    # attempt to import extras below after sys set
from pydantic import BaseModel, Field

app = FastAPI(title="Command Service", version="0.4.0")

# OpenTelemetry init (no-op if not configured via env), with safe tracer fallback
try:
    from opentelemetry import trace
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

    from .otel import \
      init_tracing  # local helper sets provider + FastAPI instrumentation

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
async def healthz() -> Dict[str, str]:
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
Status = Literal["queued", "sent", "acked"]


class CommandEvent(TypedDict, total=False):
    type: str
    id: str
    device_id: str
    name: str
    payload: Dict[str, Any] | None
    created_at: str


COMMANDS: Dict[str, Command] = {}
OUTBOX: asyncio.Queue[CommandEvent] = asyncio.Queue()
# simple in-memory idempotency cache for fallback mode
IDEMPOTENCY: Dict[str, str] = {}
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")
KAFKA_TOPIC = os.getenv("COMMAND_EVENTS_TOPIC", "command.events")
publisher_task: asyncio.Task[None] | None = None
DB_DSN: Optional[str] = None  # set when DB is initialized

# Optional authZ controls
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "false").lower() in {"1", "true", "yes"}
AUTHZ_REQUIRED = os.getenv("AUTHZ_REQUIRED", "false").lower() in {"1", "true", "yes"}
AUTH_INTROSPECT_URL = os.getenv(
    "AUTH_INTROSPECT_URL", "http://auth-service:8001/api/auth/introspect"
)
AUTH_AUTHORIZE_URL = os.getenv(
    "AUTH_AUTHORIZE_URL", "http://auth-service:8001/api/auth/authorize"
)

# Optional OPA client
try:
    from libs.shared_python.security.opa_client import \
      enforce as opa_enforce  # type: ignore
except Exception:
    try:
        import importlib.util
        import pathlib
        import sys

        _root = pathlib.Path(__file__).resolve().parents[3]
        _opa_path = _root / "libs" / "shared-python" / "security" / "opa_client.py"
        _spec_opa = importlib.util.spec_from_file_location("_opa_client", _opa_path)
        if _spec_opa and _spec_opa.loader:
            _mod_opa = importlib.util.module_from_spec(_spec_opa)
            sys.modules["_opa_client"] = _mod_opa
            _spec_opa.loader.exec_module(_mod_opa)
            opa_enforce = getattr(_mod_opa, "enforce")  # type: ignore
        else:
            opa_enforce = None  # type: ignore
    except Exception:
        opa_enforce = None  # type: ignore

# Optional JWT verifier dependency
DEPS_AUTH: list = []
try:
    from libs.shared_python.security.jwt_verifier import \
      require_auth as _require_auth  # type: ignore
except Exception:
    try:
        import importlib.util
        import pathlib
        import sys

        _root = pathlib.Path(__file__).resolve().parents[3]
        _jwt_path = _root / "libs" / "shared-python" / "security" / "jwt_verifier.py"
        _spec_jwt = importlib.util.spec_from_file_location("_jwt_verifier", _jwt_path)
        if _spec_jwt and _spec_jwt.loader:
            _mod_jwt = importlib.util.module_from_spec(_spec_jwt)
            sys.modules["_jwt_verifier"] = _mod_jwt
            _spec_jwt.loader.exec_module(_mod_jwt)
            _require_auth = getattr(_mod_jwt, "require_auth")  # type: ignore
        else:
            _require_auth = None  # type: ignore
    except Exception:
        _require_auth = None  # type: ignore

if AUTH_REQUIRED and _require_auth is not None:
    DEPS_AUTH = [Depends(_require_auth())]


async def _bearer_token(headers: Dict[str, str]) -> Optional[str]:
    auth = headers.get("authorization") or headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    return auth.split(" ", 1)[1].strip()


async def _check_auth(headers: Dict[str, str]) -> Optional[str]:
    if not AUTH_REQUIRED and not AUTHZ_REQUIRED:
        return None
    token = await _bearer_token(headers)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token"
        )
    try:
        data = await auth_introspect(token, url=AUTH_INTROSPECT_URL)
        if not data.get("active"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="inactive token"
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="auth failure"
        )
    return token


async def _check_authorize(token: Optional[str], action: str, resource: str) -> None:
    if not AUTHZ_REQUIRED:
        return
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token"
        )
    try:
        data = await auth_authorize(
            token, action=action, resource=resource, url=AUTH_AUTHORIZE_URL
        )
        if not data.get("allow"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="forbidden"
            )
        # Optional additional OPA enforcement (fail-closed if enabled)
        if opa_enforce is not None:
            allowed = await opa_enforce(
                token,
                action=action,
                resource=resource,
                subject=None,
                url=None,
                required=None,
            )
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="forbidden"
                )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="authz failure"
        )


try:
    from aiokafka import AIOKafkaProducer
except Exception:
    AIOKafkaProducer = None  # type: ignore

try:
    import psycopg
    from psycopg.rows import dict_row
except Exception:
    psycopg = None  # type: ignore


@app.post("/commands", response_model=Command, status_code=201, dependencies=DEPS_AUTH)
async def create_command(
    request: Request,
    body: CommandCreate,
    x_idempotency_key: Optional[str] = Header(default=None, alias="x-idempotency-key"),
) -> Command | Dict[str, Any]:
    with tracer.start_as_current_span("create_command"):
        # authn/z (optional)
        if request is not None:
            token = await _check_auth(request.headers)
            await _check_authorize(
                token, action="commands:create", resource=body.device_id
            )
        cid = f"cmd-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        cmd = Command(
            id=cid,
            device_id=body.device_id,
            name=body.name,
            payload=body.payload,
            created_at=now,
        )
        # persist if DB available, else in-memory fallback
        if DB_DSN is not None and psycopg is not None:
            # DB idempotency check
            if x_idempotency_key:
                async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
                    async with aconn.cursor(row_factory=dict_row) as cur:
                        await cur.execute(
                            "select command_id from idempotency where key=%s",
                            (x_idempotency_key,),
                        )
                        row = await cur.fetchone()
                        if row:
                            # return existing command
                            await cur.execute(
                                "select id, device_id, name, payload, created_at, status from commands where id=%s",
                                (row["command_id"],),
                            )
                            existing = await cur.fetchone()
                            if existing:
                                return existing
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
                    if x_idempotency_key:
                        await cur.execute(
                            """
                            insert into idempotency(key, command_id)
                            values (%s, %s)
                            on conflict (key) do nothing
                            """,
                            (x_idempotency_key, cid),
                        )
                    await cur.execute(
                        """
                        insert into outbox(kind, aggregate_id, payload)
                        values (%s, %s, %s)
                        """,
                        (
                            "command.created",
                            cid,
                            {
                                "id": cid,
                                "device_id": body.device_id,
                                "name": body.name,
                                "payload": body.payload,
                                "created_at": now,
                            },
                        ),
                    )
                    await aconn.commit()
        else:
            # in-memory idempotency
            if x_idempotency_key and x_idempotency_key in IDEMPOTENCY:
                existing_id = IDEMPOTENCY[x_idempotency_key]
                if existing_id in COMMANDS:
                    return COMMANDS[existing_id]
            COMMANDS[cid] = cmd
            if x_idempotency_key:
                IDEMPOTENCY[x_idempotency_key] = cid
            await OUTBOX.put(
                {
                    "type": "command.created",
                    "id": cid,
                    "device_id": body.device_id,
                    "name": body.name,
                    "payload": body.payload,
                    "created_at": now,
                }
            )
        return cmd


@app.patch("/commands/{command_id}/ack", status_code=204, dependencies=DEPS_AUTH)
async def ack_command(command_id: str, request: Request) -> Response:
    with tracer.start_as_current_span("ack_command"):
        token = await _check_auth(request.headers)
        await _check_authorize(token, action="commands:ack", resource=command_id)
        if DB_DSN is not None and psycopg is not None:
            async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
                async with aconn.cursor() as cur:
                    await cur.execute(
                        "update commands set status='acked', acked_at=now() where id=%s",
                        (command_id,),
                    )
                    if cur.rowcount == 0:
                        raise HTTPException(status_code=404, detail="command not found")
                    await aconn.commit()
            return Response(status_code=204)
        # in-memory fallback
        cmd = COMMANDS.get(command_id)
        if not cmd:
            raise HTTPException(status_code=404, detail="command not found")
        cmd.status = "acked"
        return Response(status_code=204)


@app.get("/commands", response_model=List[Command], dependencies=DEPS_AUTH)
async def list_commands(request: Request) -> List[Command] | List[Dict[str, Any]]:
    with tracer.start_as_current_span("list_commands"):
        token = await _check_auth(request.headers)
        await _check_authorize(token, action="commands:read", resource="command")
        if DB_DSN is not None and psycopg is not None:
            async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
                async with aconn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        "select id, device_id, name, payload, created_at, status from commands order by created_at desc limit 200"
                    )
                    rows = await cur.fetchall()
                    return rows
        return list(COMMANDS.values())


@app.get("/commands/{command_id}", response_model=Command, dependencies=DEPS_AUTH)
async def get_command(command_id: str, request: Request) -> Command | Dict[str, Any]:
    with tracer.start_as_current_span("get_command"):
        token = await _check_auth(request.headers)
        await _check_authorize(token, action="commands:read", resource=command_id)
        if DB_DSN is not None and psycopg is not None:
            async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
                async with aconn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        "select id, device_id, name, payload, created_at, status from commands where id=%s",
                        (command_id,),
                    )
                    row = await cur.fetchone()
                    if not row:
                        raise HTTPException(status_code=404, detail="command not found")
                    return row
        cmd = COMMANDS.get(command_id)
        if not cmd:
            raise HTTPException(status_code=404, detail="command not found")
        return cmd


@app.get("/example/commands")
async def list_example_commands() -> Dict[str, Any]:
    return {
        "items": [
            {
                "id": "cmd-1",
                "device_id": "dev-001",
                "name": "reboot",
                "created_at": "2024-01-01T00:00:00Z",
            },
            {
                "id": "cmd-2",
                "device_id": "dev-002",
                "name": "install_update",
                "created_at": "2024-01-02T00:00:00Z",
            },
        ]
    }


@app.get("/demo/downstream", dependencies=DEPS_AUTH)
async def demo_downstream(device_id: str = "dev-001") -> Dict[str, Any]:
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
                producer = AIOKafkaProducer(
                    bootstrap_servers=KAFKA_BOOTSTRAP, loop=loop
                )
                await producer.start()
            while True:
                # fetch one pending
                async with await psycopg.AsyncConnection.connect(DB_DSN) as aconn:  # type: ignore
                    async with aconn.cursor(row_factory=dict_row) as cur:
                        await cur.execute(
                            "select id, kind, aggregate_id, payload from outbox where sent_at is null order by id asc limit 1 for update skip locked"
                        )
                        row = await cur.fetchone()
                        if not row:
                            await asyncio.sleep(0.5)
                            continue
                        try:
                            if producer is not None:
                                await producer.send_and_wait(
                                    KAFKA_TOPIC,
                                    json.dumps(row["payload"]).encode("utf-8"),
                                )
                            await cur.execute(
                                "update outbox set sent_at = now() where id=%s",
                                (row["id"],),
                            )
                            # optional: update command status to 'sent'
                            await cur.execute(
                                "update commands set status='sent' where id=%s",
                                (row["aggregate_id"],),
                            )
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
                evt = await OUTBOX.get()
                # mark as sent in memory
                try:
                    cid = evt.get("id")
                    if cid in COMMANDS:
                        COMMANDS[cid].status = "sent"
                finally:
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
                    await producer.send_and_wait(
                        KAFKA_TOPIC, json.dumps(event).encode("utf-8")
                    )
                    # update status after publish
                    cid = event.get("id")
                    if cid in COMMANDS:
                        COMMANDS[cid].status = "sent"
                finally:
                    OUTBOX.task_done()
        finally:
            if producer is not None:
                await producer.stop()


async def _start_background() -> None:
    global publisher_task
    # ensure tables
    await _maybe_init_db()
    publisher_task = asyncio.create_task(_publisher())


async def _stop_background() -> None:
    global publisher_task
    if publisher_task is not None:
        publisher_task.cancel()
        try:
            await publisher_task
        except asyncio.CancelledError:
            pass
        publisher_task = None


@asynccontextmanager
async def lifespan(_app: FastAPI):  # FastAPI lifespan handler
    await _start_background()
    try:
        yield
    finally:
        await _stop_background()


# Activate lifespan on the router
app.router.lifespan_context = lifespan


# Keep named functions for test compatibility (no decorators)
async def on_startup() -> None:
    await _start_background()


async def on_shutdown() -> None:
    await _stop_background()


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
            # add acked_at if missing
            await cur.execute(
                "alter table commands add column if not exists acked_at timestamptz"
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
            await cur.execute(
                """
                create table if not exists idempotency(
                  key text primary key,
                  command_id text not null,
                  created_at timestamptz not null default now()
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
