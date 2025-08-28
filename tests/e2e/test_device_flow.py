import asyncio
import os
from datetime import datetime, timedelta
import jwt
import pytest
import socketio

# Config from env so the test matches the running server
SERVER_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret")
DEVICE_ID = os.environ.get("DEVICE_ID", "e2e-test-device-001")


def _make_device_jwt() -> str:
    payload = {
        "sub": DEVICE_ID,
        "device_id": DEVICE_ID,
        "type": "device",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@pytest.mark.asyncio
async def test_socketio_connect_and_auth_success():
    sio = socketio.AsyncClient()
    events = {
        "connected": asyncio.Event(),
        "authenticated": asyncio.Event(),
    }

    @sio.event
    async def connect():
        events["connected"].set()

    @sio.on("authenticated")
    async def on_authenticated(data):
        events["authenticated"].set()

    await sio.connect(SERVER_URL, transports=["websocket", "polling"])
    await asyncio.wait_for(events["connected"].wait(), timeout=10)

    token = _make_device_jwt()
    await sio.emit("authenticate", {"token": token})
    await asyncio.wait_for(events["authenticated"].wait(), timeout=10)

    await sio.disconnect()
