#!/usr/bin/env python3
import os
import json
import jwt
from datetime import datetime, timedelta, timezone
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

# Config
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5001")
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "change-me")
DEVICE_ID = os.environ.get("DEVICE_ID", "test-device-001")
COMMAND_TYPE = os.environ.get("COMMAND_TYPE", "EXECUTE_COMMAND")
# Simple payload for Phase 1
PAYLOAD = json.loads(os.environ.get("COMMAND_PAYLOAD", json.dumps({"cmd": "echo hello"})))


def create_device_jwt():
    payload = {
        "sub": DEVICE_ID,
        "device_id": DEVICE_ID,
        "type": "device",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def post_json(url: str, data: dict, headers: dict):
    body = json.dumps(data).encode("utf-8")
    req = urlrequest.Request(url, data=body, headers={"Content-Type": "application/json", **headers}, method="POST")
    with urlrequest.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def main():
    token = create_device_jwt()
    api_url = f"{BACKEND_URL.rstrip('/')}/api/commands"
    payload = {"device_id": DEVICE_ID, "type": COMMAND_TYPE, "payload": PAYLOAD}
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Dispatching command -> {api_url}")
    print(f"Device: {DEVICE_ID} | Type: {COMMAND_TYPE} | Payload: {PAYLOAD}")
    try:
        status, data = post_json(api_url, payload, headers)
        print(f"Response: {status} {data}")
    except HTTPError as e:
        try:
            detail = e.read().decode("utf-8")
        except Exception:
            detail = str(e)
        print(f"HTTPError: {e.code} {detail}")
    except URLError as e:
        print(f"URLError: {e.reason}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
