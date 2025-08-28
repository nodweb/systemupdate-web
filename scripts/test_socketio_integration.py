#!/usr/bin/env python3
import asyncio
import socketio
import jwt
import json
from datetime import datetime, timedelta, timezone
import os
import hashlib

# Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5001")
# IMPORTANT: This must match Flask app.config['JWT_SECRET_KEY'] (NOT SECRET_KEY)
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "change-me")
DEVICE_ID = os.environ.get("DEVICE_ID", "test-device-001")

# Create test JWT (HS256)
def create_device_jwt():
    payload = {
        "sub": DEVICE_ID,
        "device_id": DEVICE_ID,
        "type": "device",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

# Socket.IO client
sio = socketio.AsyncClient(logger=True, engineio_logger=True)

@sio.event
async def connect():
    print("Connected to backend")
    token = create_device_jwt()
    await sio.emit('authenticate', {'token': token})

@sio.event
async def authenticated(data):
    print(f"Authentication successful: {data}")
    # Send test heartbeat
    await sio.emit('heartbeat', {
        'battery_level': 85,
        'network_type': 'wifi',
        'location_data': {'lat': 0, 'lon': 0}
    })

@sio.event
async def auth_failed(data):
    print(f"Authentication failed: {data}")
    await sio.disconnect()

@sio.event
async def command(data):
    print(f"Received command: {data}")
    # Simulate command execution
    await asyncio.sleep(1)
    await sio.emit('command_result', {
        'command_id': data['id'],
        'status': 'completed',
        'result': {'output': 'Command executed successfully'}
    })

@sio.event
async def disconnect():
    print("Disconnected from backend")

async def main():
    # Print client fingerprint to compare with server logs
    try:
        fp = hashlib.sha256(JWT_SECRET.encode('utf-8')).hexdigest()[:10]
        print(f"Client JWT secret fp={fp} len={len(JWT_SECRET)}")
    except Exception:
        pass
    await sio.connect(BACKEND_URL)
    # Keep the client alive for a short window to receive commands
    await asyncio.sleep(30)
    await sio.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
