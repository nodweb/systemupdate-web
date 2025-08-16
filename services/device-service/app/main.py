from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from uuid import uuid4

app = FastAPI(title="SystemUpdate Device Service", version="0.1.0")

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


@app.post("/api/devices", response_model=Device, status_code=201)
async def create_device(payload: DeviceCreate) -> Device:
    dev_id = str(uuid4())
    dev = Device(id=dev_id, name=payload.name, tags=payload.tags, online=False)
    _db[dev_id] = dev
    return dev


@app.get("/api/devices/{dev_id}", response_model=Device, responses={404: {"description": "Not Found"}})
async def get_device(dev_id: str) -> Device:
    dev = _db.get(dev_id)
    if not dev:
        raise HTTPException(status_code=404, detail="device not found")
    return dev


@app.get("/api/devices", response_model=List[Device])
async def list_devices() -> List[Device]:
    return list(_db.values())


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[List[str]] = None


@app.put("/api/devices/{dev_id}", response_model=Device, responses={404: {"description": "Not Found"}})
async def update_device(dev_id: str, payload: DeviceUpdate) -> Device:
    dev = _db.get(dev_id)
    if not dev:
        raise HTTPException(status_code=404, detail="device not found")
    if payload.name is not None:
        dev.name = payload.name
    if payload.tags is not None:
        dev.tags = payload.tags
    _db[dev_id] = dev
    return dev


@app.delete("/api/devices/{dev_id}", status_code=204, responses={404: {"description": "Not Found"}})
async def delete_device(dev_id: str):
    if dev_id in _db:
        _db.pop(dev_id)
        return
    raise HTTPException(status_code=404, detail="device not found")


class PresenceUpdate(BaseModel):
    online: bool


@app.post("/api/devices/{dev_id}/presence", response_model=Device, responses={404: {"description": "Not Found"}})
async def update_presence(dev_id: str, payload: PresenceUpdate) -> Device:
    dev = _db.get(dev_id)
    if not dev:
        raise HTTPException(status_code=404, detail="device not found")
    dev.online = payload.online
    _db[dev_id] = dev
    return dev
