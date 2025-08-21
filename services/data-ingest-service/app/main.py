import asyncio
import json
import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import (FastAPI, HTTPException, Request, WebSocket,
                     WebSocketDisconnect)
from libs.shared_python.exceptions import ServiceError
from app.config import settings
from pydantic import BaseModel, Field, ValidationError

try:
    from aiokafka import AIOKafkaProducer
except Exception:  # pragma: no cover - aiokafka missing in some envs
    AIOKafkaProducer = None  # type: ignore

app = FastAPI(title="Data Ingest Service", version="0.3.0")

# Optional rate limiting (no-op if slowapi is unavailable)
try:
    from slowapi import Limiter  # type: ignore
    from slowapi.errors import RateLimitExceeded  # type: ignore
    from slowapi.util import get_remote_address  # type: ignore
    from slowapi.middleware import SlowAPIMiddleware  # type: ignore
    from slowapi import _rate_limit_exceeded_handler  # type: ignore

    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    def _limit(rule: str):
        return limiter.limit(rule)
except Exception:  # pragma: no cover - optional dependency
    def _limit(_rule: str):  # type: ignore
        def _decor(fn):
            return fn

        return _decor

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
topic_default = getattr(settings, "INGEST_TOPIC", "device.ingest.raw")
bootstrap = getattr(settings, "KAFKA_BOOTSTRAP", "kafka:9092")

# Validation controls
_allowed_kinds_str = getattr(settings, "INGEST_ALLOWED_KINDS", None)
ALLOWED_KINDS: Optional[List[str]] = (
    [s for s in _allowed_kinds_str.split(",") if s]
    if _allowed_kinds_str
    else None
)
MAX_BYTES: int = int(getattr(settings, "INGEST_MAX_BYTES", 524288))  # 512 KiB default

# Auth controls (optional)
AUTH_REQUIRED = bool(getattr(settings, "AUTH_REQUIRED", False))
AUTH_INTROSPECT_URL = getattr(
    settings, "AUTH_INTROSPECT_URL", "http://auth-service:8001/api/auth/introspect"
)


@app.on_event("startup")
async def on_startup():
    global producer
    if AIOKafkaProducer is None:
        return
    try:
        loop = asyncio.get_event_loop()
        producer = AIOKafkaProducer(bootstrap_servers=bootstrap, loop=loop)
        await producer.start()
    except Exception:
        producer = None


@app.on_event("shutdown")
async def on_shutdown():
    global producer
    try:
        if producer is not None:
            await producer.stop()
    finally:
        producer = None

    # Stop gRPC server task if present
    task = _state.get("grpc_task")
    if task is not None:
        task.cancel()


async def _check_auth(headers: Dict[str, str]) -> None:
    if not AUTH_REQUIRED:
        return
    auth = headers.get("authorization") or headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise ServiceError(401, "UNAUTHORIZED", "missing bearer token")
    token = auth.split(" ", 1)[1]
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(AUTH_INTROSPECT_URL, json={"token": token})
            r.raise_for_status()
            data = r.json()
            if not data.get("active"):
                raise ServiceError(401, "UNAUTHORIZED", "inactive token")
    except HTTPException:
        raise
    except Exception:
        # Fail closed when auth is required
        raise ServiceError(401, "UNAUTHORIZED", "auth failure")


@app.post("/ingest")
@_limit("120/minute")
async def ingest(body: IngestBody, request: Request):
    # Auth (optional)
    await _check_auth(request.headers)  # may raise 401
    # Validate kind if list provided
    if ALLOWED_KINDS is not None and body.kind not in ALLOWED_KINDS:
        raise ServiceError(422, "VALIDATION_ERROR", f"kind '{body.kind}' not allowed")
    payload = {
        "device_id": body.device_id,
        "kind": body.kind,
        "data": body.data,
    }
    encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    if len(encoded) > MAX_BYTES:
        raise ServiceError(413, "PAYLOAD_TOO_LARGE", "payload too large")
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


@app.on_event("startup")
async def _maybe_start_grpc():
    # Defer import to runtime
    try:
        from .grpc_server import INGEST_ENABLED, serve  # type: ignore

        if INGEST_ENABLED:
            task = asyncio.create_task(serve(_grpc_handler_send))
            _state["grpc_task"] = task
    except Exception:
        # If grpc server cannot start, continue HTTP service
        pass
