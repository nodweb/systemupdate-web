import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from .security import validate_token as _sec_validate_token, get_claims as _sec_get_claims
from .policy import allow_ws_connect

app = FastAPI(title="SystemUpdate WS Hub", version="0.1.0")

# OpenTelemetry initialization (no-op if not configured via env)
try:
    from .otel import init_tracing

    init_tracing(service_name="ws-hub", app=app)
except Exception:
    # Do not fail service if observability is misconfigured in dev
    pass

HEARTBEAT_INTERVAL_SEC = 15


class HealthResponse(BaseModel):
    status: str


@app.get("/healthz", response_model=HealthResponse)
async def healthz() -> HealthResponse:
    return HealthResponse(status="ok")


class Connection:
    def __init__(self, ws: WebSocket, client_id: str):
        self.ws = ws
        self.client_id = client_id
        self.last_pong: datetime = datetime.now(timezone.utc)
        self.alive = True

    async def sender(self):
        try:
            while self.alive:
                await asyncio.sleep(HEARTBEAT_INTERVAL_SEC)
                # send ping
                await self.ws.send_json({"type": "ping", "ts": datetime.now(timezone.utc).isoformat()})
        except Exception:
            self.alive = False

    async def receiver(self):
        try:
            while self.alive:
                msg = await self.ws.receive_json()
                if isinstance(msg, dict) and msg.get("type") == "pong":
                    self.last_pong = datetime.now(timezone.utc)
                    # Do not echo pong messages; just update heartbeat timestamp
                    continue
                # echo for now (stub) for all non-pong messages
                await self.ws.send_json({"type": "echo", "data": msg})
        except Exception:
            self.alive = False


connections: Dict[str, Connection] = {}


def validate_token(token: str) -> bool:
    # Backward-compatible helper (kept for tests); prefer get_claims + policy
    return _sec_validate_token(token)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(default=""), cid: str = Query(default="")):
    # Require token, client id, and policy allow
    claims = _sec_get_claims(token) if token else {}
    if not cid or not claims or not allow_ws_connect(claims, cid):
        await ws.close(code=4401)
        return
    await ws.accept()
    conn = Connection(ws, cid)
    connections[cid] = conn
    sender_task = asyncio.create_task(conn.sender())
    receiver_task = asyncio.create_task(conn.receiver())
    try:
        await asyncio.wait(
            {sender_task, receiver_task}, return_when=asyncio.FIRST_COMPLETED
        )
    except WebSocketDisconnect:
        pass
    finally:
        conn.alive = False
        sender_task.cancel()
        receiver_task.cancel()
        connections.pop(cid, None)
        try:
            await ws.close()
        except Exception:
            pass
