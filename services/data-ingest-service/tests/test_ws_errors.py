from fastapi.testclient import TestClient
import importlib.util
from pathlib import Path

# Dynamically load app.main because the package directory has a hyphen
APP_MAIN = Path(__file__).resolve().parents[1] / "app" / "main.py"
spec = importlib.util.spec_from_file_location("ingest_main", APP_MAIN)
ingest_main = importlib.util.module_from_spec(spec)  # type: ignore
assert spec and spec.loader
spec.loader.exec_module(ingest_main)  # type: ignore

app = ingest_main.app
client = TestClient(app)


def test_ws_disallowed_kind(monkeypatch):
    monkeypatch.setattr(ingest_main, "ALLOWED_KINDS", ["metric"], raising=False)

    with client.websocket_connect("/ws/ingest") as ws:
        ws.send_json({"device_id": "d1", "kind": "log", "data": {}})
        data = ws.receive_json()
        assert data["accepted"] is False
        assert data["error"] == "kind not allowed"


def test_ws_invalid_json():
    with client.websocket_connect("/ws/ingest") as ws:
        ws.send_text("{not-json}")
        data = ws.receive_json()
        assert data["accepted"] is False
        assert data["error"] == "invalid json"
