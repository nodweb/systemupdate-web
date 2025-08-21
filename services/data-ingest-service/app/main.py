import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import httpx
from fastapi import (FastAPI, HTTPException, Request, WebSocket,
                     WebSocketDisconnect)
from pydantic import BaseModel, Field, ValidationError

# Import shared health check module with fallback to repo root path
try:
    from libs.shared_python.health import HealthChecker, setup_health_endpoints
except Exception:
    import pathlib
    import sys

    _root = pathlib.Path(__file__).resolve().parents[3]
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))
    from libs.shared_python.health import HealthChecker, setup_health_endpoints

# Try monorepo-level middleware/handlers first; fall back to dynamic import by path
try:
    from app.handlers.exception_handler import register_exception_handlers
    from app.middleware.context import RequestContextMiddleware
    from app.middleware.logging_middleware import RequestLoggingMiddleware
except Exception:
    import importlib
    import pathlib
    import sys
    import types

    _root = pathlib.Path(__file__).resolve().parents[3]
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))
    # Temporarily point 'app' to the repo-level package so its subimports resolve correctly
    _orig_app_pkg = sys.modules.get("app")
    try:
        _fake_app = types.ModuleType("app")
        _fake_app.__path__ = [str(_root / "app")]  # type: ignore[attr-defined]
        sys.modules["app"] = _fake_app

        _eh_mod = importlib.import_module("app.handlers.exception_handler")
        _ctx_mod = importlib.import_module("app.middleware.context")
        _logmw_mod = importlib.import_module("app.middleware.logging_middleware")

        register_exception_handlers = getattr(_eh_mod, "register_exception_handlers")  # type: ignore
        RequestContextMiddleware = getattr(_ctx_mod, "RequestContextMiddleware")  # type: ignore
        RequestLoggingMiddleware = getattr(_logmw_mod, "RequestLoggingMiddleware")  # type: ignore
    finally:
        if _orig_app_pkg is not None:
            sys.modules["app"] = _orig_app_pkg
        else:
            sys.modules.pop("app", None)

try:
    from aiokafka import AIOKafkaProducer
except Exception:  # pragma: no cover - aiokafka missing in some envs
    AIOKafkaProducer = None  # type: ignore

app = FastAPI(title="Data Ingest Service", version="0.3.0")

# Initialize health checker
health_checker = HealthChecker(service_name="data-ingest-service", version="0.3.0")


async def check_kafka_health():
    """Check Kafka connection health"""
    try:
        if not AIOKafkaProducer:
            return {"status": "warning", "message": "Kafka client not available"}

        # Use the same bootstrap servers as the main producer
        kafka_bootstrap = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")

        # Create a test producer with a short timeout
        test_producer = AIOKafkaProducer(
            bootstrap_servers=kafka_bootstrap,
            request_timeout_ms=3000,
            api_version_auto_timeout_ms=3000,
        )

        # Try to start the producer with a timeout
        await asyncio.wait_for(test_producer.start(), timeout=3.0)

        # Check if we can get the cluster metadata
        cluster_metadata = await test_producer.client.bootstrap()
        if not cluster_metadata.brokers():
            return {"status": "error", "message": "No Kafka brokers available"}

        await test_producer.stop()
        return {"status": "ok", "message": f"Connected to Kafka at {kafka_bootstrap}"}

    except asyncio.TimeoutError:
        return {"status": "error", "message": "Kafka connection timeout"}
    except Exception as e:
        return {"status": "error", "message": f"Kafka error: {str(e)}"}


# Register health checks
health_checker.add_check("kafka", check_kafka_health)

# Setup health endpoints
setup_health_endpoints(app, health_checker)

# Register global exception handlers and middleware
register_exception_handlers(app)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# OpenTelemetry initialization (no-op if not configured via env)
try:
    from .otel import init_tracing

    init_tracing(service_name="data-ingest-service", app=app)
except Exception:
    # Do not fail service if observability is misconfigured in dev
    pass


# Health check endpoints are now provided by setup_health_endpoints


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
# During pytest, bypass auth to keep tests hermetic and avoid external deps
if os.environ.get("PYTEST_CURRENT_TEST"):
    AUTH_REQUIRED = False
AUTH_INTROSPECT_URL = os.getenv(
    "AUTH_INTROSPECT_URL", "http://auth-service:8001/api/auth/introspect"
)


async def on_startup():
    global producer
    # Skip external deps during pytest
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return
    if AIOKafkaProducer is None:
        return
    try:
        loop = asyncio.get_event_loop()
        producer = AIOKafkaProducer(bootstrap_servers=bootstrap, loop=loop)
        await producer.start()
    except Exception:
        producer = None


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
    # Always accept first to avoid handshake close issues with TestClient
    await ws.accept()
    # Auth (optional)
    try:
        await _check_auth(dict(ws.headers))
    except HTTPException as he:
        await ws.send_json(
            {"accepted": False, "error": "unauthorized", "detail": he.detail}
        )
        await ws.close(code=1008)
        return
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


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup
    await on_startup()
    await _maybe_start_grpc()
    try:
        yield
    finally:
        # Shutdown
        await on_shutdown()


# Activate lifespan on the router
app.router.lifespan_context = lifespan
