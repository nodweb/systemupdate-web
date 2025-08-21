import asyncio
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, status

# Safe import for shared authorize client despite hyphen in directory name
try:
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
if (
    os.getenv("AUTH_REQUIRED", "false").lower() in {"1", "true", "yes"}
    and _require_auth is not None
):
    DEPS_AUTH = [Depends(_require_auth())]

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

app = FastAPI(title="Analytics Service", version="0.3.0")

# Optional rate limiting (no-op if slowapi not installed)
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


# Security headers middleware (no-op if helper missing)
try:
    from libs.shared_python.security.headers import \
      add_security_headers  # type: ignore

    add_security_headers(app)
except Exception:
    pass


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/demo/e2e", dependencies=DEPS_AUTH)
async def demo_e2e(device_id: str = "dev-001", request: Request = None):
    """
    Starts an end-to-end trace by calling command-service which calls device-service.
    """
    with tracer.start_as_current_span("analytics.demo_e2e"):
        await _check_auth(request.headers if request else {})
        await _check_authorize(
            _state.get("_last_token"), action="analytics:demo", resource=device_id
        )
        url = "http://command-service:8004/demo/downstream"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url, params={"device_id": device_id})
            r.raise_for_status()
            data = r.json()
        return {"ok": True, "via": "command-service", "device": data}


# ---------------- Minimal batch/stream endpoints ----------------
@app.post("/batch/run", dependencies=DEPS_AUTH)
@_limit("10/minute")
async def run_batch(kind: str = "daily", request: Request = None):
    # placeholder batch job
    with tracer.start_as_current_span("analytics.batch"):
        await _check_auth(request.headers if request else {})
        await _check_authorize(
            _state.get("_last_token"), action="analytics:batch", resource=kind
        )
        await asyncio.sleep(0)  # yield
        return {"ok": True, "kind": kind}


@app.post("/stream/start", dependencies=DEPS_AUTH)
@_limit("5/minute")
async def start_stream(topics: Optional[List[str]] = None, request: Request = None):
    # placeholder hook to indicate consumer is running via background task
    await _check_auth(request.headers if request else {})
    await _check_authorize(
        _state.get("_last_token"),
        action="analytics:stream",
        resource=",".join(topics or []),
    )
    running = _state.get("consumer_running", False)
    return {"ok": True, "running": running, "topics": topics}


# ---------------- Optional Kafka consumer scaffold ----------------
LOGGER = logging.getLogger(__name__)
# Prefer structured logger from shared libs, but don't fail if unavailable
try:
    from libs.shared_python.logging_utils import \
      get_structured_logger  # type: ignore

    LOGGER = get_structured_logger("analytics-service")
except Exception:
    pass

# Typed settings (validation) with safe fallback
try:
    from app.config import settings  # type: ignore
except Exception:
    class _Settings:
        KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")
        ANALYTICS_CONSUME_ENABLED = (
            os.getenv("ANALYTICS_CONSUME_ENABLED", "false").lower()
            in {"1", "true", "yes"}
        )
        KAFKA_TOPICS = [
            t.strip()
            for t in os.getenv(
                "ANALYTICS_CONSUME_TOPICS", "device.ingest.raw"
            ).split(",")
            if t.strip()
        ]

    settings = _Settings()  # type: ignore

KAFKA_BOOTSTRAP = getattr(settings, "KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
CONSUME_ENABLED = bool(getattr(settings, "ANALYTICS_CONSUME_ENABLED", False))
CONSUME_TOPICS = list(getattr(settings, "KAFKA_TOPICS", ["device.ingest.raw"]))
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


# --------------- Optional auth/authz via auth-service ---------------
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "false").lower() in {"1", "true", "yes"}
AUTHZ_REQUIRED = os.getenv("AUTHZ_REQUIRED", "false").lower() in {"1", "true", "yes"}
AUTH_INTROSPECT_URL = os.getenv(
    "AUTH_INTROSPECT_URL", "http://auth-service:8001/api/auth/introspect"
)
AUTH_AUTHORIZE_URL = os.getenv(
    "AUTH_AUTHORIZE_URL", "http://auth-service:8001/api/auth/authorize"
)


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
        _state["_last_token"] = token
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
        # Optional OPA enforcement
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


@app.on_event("startup")
async def _maybe_start_consumer():
    if CONSUME_ENABLED:
        try:
            _state["consumer_task"] = asyncio.create_task(_consume_loop())
            LOGGER.info(
                "analytics consumer started for topics: %s", ",".join(CONSUME_TOPICS)
            )
        except Exception:
            LOGGER.exception("failed to start analytics consumer")


@app.on_event("shutdown")
async def _stop_consumer():
    task = _state.get("consumer_task")
    if task:
        task.cancel()
