import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import httpx
from fastapi import (FastAPI, HTTPException, Request, WebSocket,
                     WebSocketDisconnect)
from pydantic import BaseModel, Field, ValidationError

try:
    from aiokafka import AIOKafkaProducer
except Exception:  # pragma: no cover - aiokafka missing in some envs
    AIOKafkaProducer = None  # type: ignore

app = FastAPI(title="Data Ingest Service", version="0.3.0")

LOGGER = logging.getLogger("data-ingest-service")

# OpenTelemetry initialization (no-op if not configured via env)
try:
    from .otel import init_tracing

    init_tracing(service_name="data-ingest-service", app=app)
except Exception:
    # Do not fail service if observability is misconfigured in dev
    pass


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


class IngestBody(BaseModel):
    device_id: str = Field(..., min_length=1)
    kind: str = Field(..., min_length=1)
    data: Dict[str, Any]


producer = None
topic_default = os.getenv("INGEST_TOPIC", "device.ingest.raw")
bootstrap = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")

# Validation controls
ALLOWED_KINDS: Optional[List[str]] = (
    os.getenv("INGEST_ALLOWED_KINDS").split(",")
    if os.getenv("INGEST_ALLOWED_KINDS")
    else None
)
MAX_BYTES: int = int(os.getenv("INGEST_MAX_BYTES", "524288"))  # 512 KiB default

# Auth controls (optional)
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "false").lower() in {"1", "true", "yes"}
AUTH_INTROSPECT_URL = os.getenv(
    "AUTH_INTROSPECT_URL", "http://auth-service:8001/api/auth/introspect"
)

# Background controls
INGEST_PUBLISH_ENABLED = os.getenv("INGEST_PUBLISH_ENABLED", "true").lower() in {
    "1",
    "true",
    "yes",
}


def _in_pytest() -> bool:
    return bool(os.environ.get("PYTEST_CURRENT_TEST"))


async def _start_kafka() -> None:
    global producer
    if not INGEST_PUBLISH_ENABLED:
        try:
            LOGGER.info(
                "Service lifecycle event",
                extra={
                    "event": "startup",
                    "component": "kafka_producer",
                    "enabled": False,
                    "reason": "INGEST_PUBLISH_ENABLED=false",
                },
            )
        except Exception:
            pass
        return
    if AIOKafkaProducer is None:
        # No kafka lib available; operate in accept-only mode
        try:
            LOGGER.info(
                "Service lifecycle event",
                extra={
                    "event": "startup",
                    "component": "kafka_producer",
                    "enabled": False,
                    "reason": "aiokafka_missing",
                },
            )
        except Exception:
            pass
        return
    if _in_pytest():
        # Gate kafka during pytest
        try:
            LOGGER.info(
                "Service lifecycle event",
                extra={
                    "event": "startup",
                    "component": "kafka_producer",
                    "enabled": False,
                    "reason": "pytest_gating_kafka",
                },
            )
        except Exception:
            pass
        return
    try:
        loop = asyncio.get_event_loop()
        _producer = AIOKafkaProducer(bootstrap_servers=bootstrap, loop=loop)
        await _producer.start()
        producer = _producer
        try:
            LOGGER.info(
                "Service lifecycle event",
                extra={
                    "event": "startup",
                    "component": "kafka_producer",
                    "enabled": True,
                    "bootstrap": bootstrap,
                    "topic_default": topic_default,
                },
            )
        except Exception:
            pass
    except Exception:
        producer = None


async def _stop_kafka() -> None:
    global producer
    if producer is not None:
        try:
            await producer.stop()
        except Exception:
            pass
        finally:
            producer = None
        try:
            LOGGER.info(
                "Service lifecycle event",
                extra={
                    "event": "shutdown",
                    "component": "kafka_producer",
                },
            )
        except Exception:
            pass


async def _check_auth(headers: Dict[str, str]) -> None:
    if not AUTH_REQUIRED:
        return
    auth = headers.get("authorization") or headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = auth.split(" ", 1)[1]
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(AUTH_INTROSPECT_URL, json={"token": token})
            r.raise_for_status()
            data = r.json()
            if not data.get("active"):
                raise HTTPException(status_code=401, detail="inactive token")
    except HTTPException:
        raise
    except Exception:
        # Fail closed when auth is required
        raise HTTPException(status_code=401, detail="auth failure")


@app.get("/producer/status")
async def producer_status() -> Dict[str, bool]:
    return {"running": bool(producer is not None)}


@app.post("/ingest")
async def ingest(body: IngestBody, request: Request):
    # Auth (optional)
    await _check_auth(request.headers)  # may raise 401
    # Validate kind if list provided
    if ALLOWED_KINDS is not None and body.kind not in ALLOWED_KINDS:
        raise HTTPException(status_code=422, detail=f"kind '{body.kind}' not allowed")
    payload = {
        "device_id": body.device_id,
        "kind": body.kind,
        "data": body.data,
    }
    encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    if len(encoded) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="payload too large")
    sent = False
    if producer is not None:
        try:
            await producer.send_and_wait(topic_default, encoded)
            sent = True
        except Exception:
            sent = False
    return {"accepted": True, "kafka_sent": sent}


@app.websocket("/ws/ingest")
async def ws_ingest(ws: WebSocket):
    # Auth (optional)
    try:
        # WebSocket headers available pre-accept
        await _check_auth(dict(ws.headers))
    except HTTPException as he:
        await ws.accept()
        await ws.send_json(
            {"accepted": False, "error": "unauthorized", "detail": he.detail}
        )
        await ws.close(code=1008)
        return
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_text()
            try:
                data = json.loads(msg)
                # validate shape via IngestBody to reuse rules
                model = IngestBody(**data)
                if ALLOWED_KINDS is not None and model.kind not in ALLOWED_KINDS:
                    await ws.send_json({"accepted": False, "error": "kind not allowed"})
                    continue
                payload = {
                    "device_id": model.device_id,
                    "kind": model.kind,
                    "data": model.data,
                }
                encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
                if len(encoded) > MAX_BYTES:
                    await ws.send_json(
                        {"accepted": False, "error": "payload too large"}
                    )
                    continue
                sent = False
                if producer is not None:
                    try:
                        await producer.send_and_wait(topic_default, encoded)
                        sent = True
                    except Exception:
                        sent = False
                await ws.send_json({"accepted": True, "kafka_sent": sent})
            except ValidationError as ve:
                await ws.send_json(
                    {"accepted": False, "error": "validation", "details": ve.errors()}
                )
            except Exception:
                await ws.send_json({"accepted": False, "error": "invalid json"})
    except WebSocketDisconnect:
        return


# ---------------- Optional gRPC ingest ----------------
_state: Dict[str, Any] = {}


async def _grpc_handler_send(device_id: str, kind: str, data_json: str):
    try:
        data = json.loads(data_json)
    except Exception:
        return False, False, "invalid json"
    try:
        model = IngestBody(device_id=device_id, kind=kind, data=data)
    except ValidationError as ve:  # type: ignore
        return False, False, f"validation: {ve.errors()}"
    if ALLOWED_KINDS is not None and model.kind not in ALLOWED_KINDS:
        return False, False, "kind not allowed"
    payload = {"device_id": model.device_id, "kind": model.kind, "data": model.data}
    encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    if len(encoded) > MAX_BYTES:
        return False, False, "payload too large"
    sent = False
    if producer is not None:
        try:
            await producer.send_and_wait(topic_default, encoded)
            sent = True
        except Exception:
            sent = False
    return True, sent, None


async def _start_grpc() -> None:
    # Defer import to runtime
    try:
        from .grpc_server import INGEST_ENABLED, serve  # type: ignore

        if INGEST_ENABLED:
            if _in_pytest():
                # avoid running grpc server within pytest
                try:
                    LOGGER.info(
                        "Service lifecycle event",
                        extra={
                            "event": "startup",
                            "component": "grpc_server",
                            "enabled": False,
                            "reason": "pytest_gating_grpc",
                        },
                    )
                except Exception:
                    pass
                return
            task = asyncio.create_task(serve(_grpc_handler_send))
            _state["grpc_task"] = task
            try:
                LOGGER.info(
                    "Service lifecycle event",
                    extra={
                        "event": "startup",
                        "component": "grpc_server",
                        "enabled": True,
                    },
                )
            except Exception:
                pass
    except Exception:
        # If grpc server cannot start, continue HTTP service
        try:
            LOGGER.info(
                "Service lifecycle event",
                extra={
                    "event": "startup",
                    "component": "grpc_server",
                    "enabled": False,
                    "reason": "grpc_start_failed",
                },
            )
        except Exception:
            pass


async def _stop_grpc() -> None:
    task = _state.get("grpc_task")
    if task is not None:
        task.cancel()
        try:
            await task
        except Exception:
            pass
        finally:
            _state["grpc_task"] = None
        try:
            LOGGER.info(
                "Service lifecycle event",
                extra={
                    "event": "shutdown",
                    "component": "grpc_server",
                },
            )
        except Exception:
            pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup
    await _start_kafka()
    await _start_grpc()
    try:
        yield
    finally:
        # Shutdown
        await _stop_grpc()
        await _stop_kafka()


# Attach lifespan to app
app.router.lifespan_context = lifespan
