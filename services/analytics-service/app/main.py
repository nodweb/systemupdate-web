import httpx
import asyncio
import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI

try:
    from opentelemetry import trace

    tracer = trace.get_tracer(__name__)
except Exception:

    class _Noop:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    class _Tracer:
        def start_as_current_span(self, name):
            return _Noop()

    tracer = _Tracer()

app = FastAPI(title="Analytics Service", version="0.2.0")

# OpenTelemetry initialization (no-op if not configured via env)
try:
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

    from .otel import init_tracing

    init_tracing(service_name="analytics-service", app=app)
    try:
        HTTPXClientInstrumentor().instrument()
    except Exception:
        pass
except Exception:
    # Do not fail service if observability is misconfigured in dev
    pass


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/demo/e2e")
async def demo_e2e(device_id: str = "dev-001"):
    """
    Starts an end-to-end trace by calling command-service which calls device-service.
    """
    with tracer.start_as_current_span("analytics.demo_e2e"):
        url = "http://command-service:8004/demo/downstream"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url, params={"device_id": device_id})
            r.raise_for_status()
            data = r.json()
        return {"ok": True, "via": "command-service", "device": data}


# ---------------- Minimal batch/stream endpoints ----------------
@app.post("/batch/run")
async def run_batch(kind: str = "daily"):
    # placeholder batch job
    with tracer.start_as_current_span("analytics.batch"):
        await asyncio.sleep(0)  # yield
        return {"ok": True, "kind": kind}


@app.post("/stream/start")
async def start_stream(topics: Optional[List[str]] = None):
    # placeholder hook to indicate consumer is running via background task
    running = _state.get("consumer_running", False)
    return {"ok": True, "running": running, "topics": topics}


# ---------------- Optional Kafka consumer scaffold ----------------
LOGGER = logging.getLogger(__name__)
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")
CONSUME_ENABLED = os.getenv("ANALYTICS_CONSUME_ENABLED", "false").lower() in {"1", "true", "yes"}
CONSUME_TOPICS = [t.strip() for t in os.getenv("ANALYTICS_CONSUME_TOPICS", "device.ingest.raw").split(",") if t.strip()]
_state: Dict[str, Any] = {}

try:
    from aiokafka import AIOKafkaConsumer  # type: ignore
except Exception:
    AIOKafkaConsumer = None  # type: ignore


async def _consume_loop():
    if AIOKafkaConsumer is None:
        LOGGER.warning("aiokafka not installed; analytics consumer disabled")
        return
    consumer = AIOKafkaConsumer(
        *CONSUME_TOPICS,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        enable_auto_commit=True,
        auto_offset_reset="latest",
    )
    await consumer.start()
    _state["consumer_running"] = True
    try:
        async for msg in consumer:
            # Minimal processing stub; parse JSON and drop
            try:
                # msg.value is bytes
                _ = len(msg.value)
            except Exception:
                pass
    finally:
        _state["consumer_running"] = False
        await consumer.stop()


@app.on_event("startup")
async def _maybe_start_consumer():
    if CONSUME_ENABLED:
        try:
            _state["consumer_task"] = asyncio.create_task(_consume_loop())
            LOGGER.info("analytics consumer started for topics: %s", ",".join(CONSUME_TOPICS))
        except Exception:
            LOGGER.exception("failed to start analytics consumer")


@app.on_event("shutdown")
async def _stop_consumer():
    task = _state.get("consumer_task")
    if task:
        task.cancel()
