import os
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime, timezone
import uuid

app = FastAPI(title="Command Service", version="0.3.0")

# Optional OpenTelemetry
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter
    _otel_ok = True
except Exception:
    _otel_ok = False

if _otel_ok:
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(provider)
    tracer = trace.get_tracer(__name__)
else:
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

try:
    from aiokafka import AIOKafkaProducer
except Exception:
    AIOKafkaProducer = None  # type: ignore


@app.post("/commands", response_model=Command, status_code=201)
async def create_command(body: CommandCreate):
    with tracer.start_as_current_span("create_command"):
        cid = f"cmd-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        cmd = Command(id=cid, device_id=body.device_id, name=body.name, payload=body.payload, created_at=now)
        COMMANDS[cid] = cmd
        # enqueue event for publisher
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
        return list(COMMANDS.values())


@app.get("/commands/{command_id}", response_model=Command)
async def get_command(command_id: str):
    with tracer.start_as_current_span("get_command"):
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


async def _publisher() -> None:
    if AIOKafkaProducer is None:
        # aiokafka not available; drain without sending
        while True:
            await OUTBOX.get()
            OUTBOX.task_done()
        return
    producer: AIOKafkaProducer | None = None
    try:
        loop = asyncio.get_event_loop()
        producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP, loop=loop)
        await producer.start()
        while True:
            event = await OUTBOX.get()
            try:
                payload = (str(event)).encode("utf-8")
                await producer.send_and_wait(KAFKA_TOPIC, payload)
            finally:
                OUTBOX.task_done()
    finally:
        if producer is not None:
            await producer.stop()


@app.on_event("startup")
async def on_startup() -> None:
    global publisher_task
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
