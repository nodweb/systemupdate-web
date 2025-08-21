import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request, status
from pydantic import BaseModel, Field

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

    _tracer = trace.get_tracer(__name__)
except Exception:

    class _Noop:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    class _Tracer:
        def start_as_current_span(self, name):
            return _Noop()

    _tracer = _Tracer()

logger = logging.getLogger("device-service")

app = FastAPI(title="SystemUpdate Device Service", version="0.2.0")

# OpenTelemetry initialization (no-op if not configured via env)
try:
    from .otel import init_tracing

    init_tracing(service_name="device-service", app=app)
except Exception:
    # Do not fail service if observability is misconfigured in dev
    pass


class HealthResponse(BaseModel):
    status: str


@app.get("/healthz", response_model=HealthResponse)
async def healthz() -> HealthResponse:
    return HealthResponse(status="ok")


class DeviceCreate(BaseModel):
    name: str = Field(..., min_length=1)
    tags: List[str] = []


class Device(DeviceCreate):
    id: str
    online: bool = False


_db: Dict[str, Device] = {}

# Background worker controls
DEVICE_WORKER_ENABLED = os.getenv("DEVICE_WORKER_ENABLED", "true").lower() in {
    "1",
    "true",
    "yes",
}
_worker_task: asyncio.Task | None = None


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
        # Optional additional OPA enforcement
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


@app.post(
    "/api/devices", response_model=Device, status_code=201, dependencies=DEPS_AUTH
)
async def create_device(payload: DeviceCreate, request: Request) -> Device:
    token = await _check_auth(request.headers)
    await _check_authorize(token, action="devices:create", resource="device")
    dev_id = str(uuid4())
    dev = Device(id=dev_id, name=payload.name, tags=payload.tags, online=False)
    _db[dev_id] = dev
    return dev


@app.get(
    "/api/devices/{dev_id}",
    response_model=Device,
    responses={404: {"description": "Not Found"}},
    dependencies=DEPS_AUTH,
)
async def get_device(dev_id: str, request: Request) -> Device:
    token = await _check_auth(request.headers)
    await _check_authorize(token, action="devices:read", resource=dev_id)
    dev = _db.get(dev_id)
    if not dev:
        raise HTTPException(status_code=404, detail="device not found")
    return dev


@app.get("/api/devices", response_model=List[Device], dependencies=DEPS_AUTH)
async def list_devices(request: Request) -> List[Device]:
    token = await _check_auth(request.headers)
    await _check_authorize(token, action="devices:read", resource="device")
    return list(_db.values())


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[List[str]] = None


@app.put(
    "/api/devices/{dev_id}",
    response_model=Device,
    responses={404: {"description": "Not Found"}},
    dependencies=DEPS_AUTH,
)
async def update_device(dev_id: str, payload: DeviceUpdate, request: Request) -> Device:
    token = await _check_auth(request.headers)
    await _check_authorize(token, action="devices:update", resource=dev_id)
    dev = _db.get(dev_id)
    if not dev:
        raise HTTPException(status_code=404, detail="device not found")
    if payload.name is not None:
        dev.name = payload.name
    if payload.tags is not None:
        dev.tags = payload.tags
    _db[dev_id] = dev
    return dev


@app.delete(
    "/api/devices/{dev_id}",
    status_code=204,
    responses={404: {"description": "Not Found"}},
    dependencies=DEPS_AUTH,
)
async def delete_device(dev_id: str, request: Request):
    token = await _check_auth(request.headers)
    await _check_authorize(token, action="devices:delete", resource=dev_id)
    if dev_id in _db:
        _db.pop(dev_id)
        return
    raise HTTPException(status_code=404, detail="device not found")


class PresenceUpdate(BaseModel):
    online: bool


@app.post(
    "/api/devices/{dev_id}/presence",
    response_model=Device,
    responses={404: {"description": "Not Found"}},
    dependencies=DEPS_AUTH,
)
async def update_presence(
    dev_id: str, payload: PresenceUpdate, request: Request
) -> Device:
    token = await _check_auth(request.headers)
    await _check_authorize(token, action="presence:update", resource=dev_id)
    dev = _db.get(dev_id)
    if not dev:
        raise HTTPException(status_code=404, detail="device not found")
    dev.online = payload.online
    _db[dev_id] = dev
    return dev


@app.get("/demo/leaf")
async def demo_leaf(device_id: str = "dev-001"):
    """
    Leaf endpoint for e2e tracing demo. Creates a span and returns a simple payload.
    """
    with _tracer.start_as_current_span("device.demo_leaf"):
        now = datetime.now(timezone.utc).isoformat()
        # ensure device exists in in-memory DB for demo
        if device_id not in _db:
            _db[device_id] = Device(
                id=device_id, name=f"Device {device_id}", tags=["demo"], online=True
            )
        dev = _db[device_id]
        return {"device_id": dev.id, "name": dev.name, "online": dev.online, "ts": now}


@app.get("/worker/status")
def worker_status():
    return {"running": bool(_worker_task is not None and not _worker_task.done())}


# ---------------- Lifespan management ----------------
def _in_pytest() -> bool:
    return bool(os.environ.get("PYTEST_CURRENT_TEST"))


async def _worker_loop():
    try:
        while True:
            await asyncio.sleep(60.0)
    except asyncio.CancelledError:
        raise


async def _start_worker():
    global _worker_task
    if not DEVICE_WORKER_ENABLED:
        try:
            logger.info(
                "Service lifecycle event",
                extra={
                    "service": "device-service",
                    "event": "startup",
                    "component": "worker",
                    "enabled": False,
                    "reason": "DEVICE_WORKER_ENABLED=false",
                },
            )
        except Exception:
            pass
        return
    if _in_pytest():
        try:
            logger.info(
                "Service lifecycle event",
                extra={
                    "service": "device-service",
                    "event": "startup",
                    "component": "worker",
                    "enabled": False,
                    "reason": "pytest_gating_worker",
                },
            )
        except Exception:
            pass
        return
    _worker_task = asyncio.create_task(_worker_loop())
    try:
        logger.info(
            "Service lifecycle event",
            extra={
                "service": "device-service",
                "event": "startup",
                "component": "worker",
                "enabled": True,
            },
        )
    except Exception:
        pass


async def _stop_worker():
    global _worker_task
    if _worker_task is not None:
        _worker_task.cancel()
        try:
            await _worker_task
        except Exception:
            pass
        finally:
            _worker_task = None
        try:
            logger.info(
                "Service lifecycle event",
                extra={
                    "service": "device-service",
                    "event": "shutdown",
                    "component": "worker",
                },
            )
        except Exception:
            pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await _start_worker()
    try:
        yield
    finally:
        await _stop_worker()


app.router.lifespan_context = lifespan
