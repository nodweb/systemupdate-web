import os
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, Request, status
from pydantic import BaseModel, Field

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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(AUTH_INTROSPECT_URL, json={"token": token})
            r.raise_for_status()
            data = r.json()
            if not data.get("active"):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="inactive token")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="auth failure")
    return token


async def _check_authorize(token: Optional[str], action: str, resource: str) -> None:
    if not AUTHZ_REQUIRED:
        return
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(
                AUTH_AUTHORIZE_URL,
                json={"token": token, "action": action, "resource": resource},
            )
            if r.status_code == 403:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
            r.raise_for_status()
            data = r.json()
            if not data.get("allow"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="authz failure")


@app.post("/api/devices", response_model=Device, status_code=201)
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
)
async def get_device(dev_id: str, request: Request) -> Device:
    token = await _check_auth(request.headers)
    await _check_authorize(token, action="devices:read", resource=dev_id)
    dev = _db.get(dev_id)
    if not dev:
        raise HTTPException(status_code=404, detail="device not found")
    return dev


@app.get("/api/devices", response_model=List[Device])
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
)
async def update_presence(dev_id: str, payload: PresenceUpdate, request: Request) -> Device:
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
