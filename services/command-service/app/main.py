from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime, timezone
import uuid

app = FastAPI(title="Command Service", version="0.2.0")


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


@app.post("/commands", response_model=Command, status_code=201)
async def create_command(body: CommandCreate):
    cid = f"cmd-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    cmd = Command(id=cid, device_id=body.device_id, name=body.name, payload=body.payload, created_at=now)
    COMMANDS[cid] = cmd
    # TODO: Outbox and publish event to Kafka in M1
    return cmd


@app.get("/commands", response_model=List[Command])
async def list_commands():
    return list(COMMANDS.values())


@app.get("/commands/{command_id}", response_model=Command)
async def get_command(command_id: str):
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
