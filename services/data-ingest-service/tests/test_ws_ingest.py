import importlib.util
import pathlib
import sys

from fastapi.testclient import TestClient

# Always load the service's app.main by file path to avoid repo-level app import
_svc_main = pathlib.Path(__file__).resolve().parents[1] / "app" / "main.py"
spec = importlib.util.spec_from_file_location("ingest_app_main", _svc_main)
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
sys.modules["ingest_app_main"] = mod
spec.loader.exec_module(mod)
app = getattr(mod, "app")


def test_ws_ingest_accepts_and_replies():
    client = TestClient(app)
    with client.websocket_connect("/ws/ingest") as ws:
        ws.send_json({"device_id": "dev-1", "kind": "metric", "data": {"cpu": 0.5}})
        data = ws.receive_json()
        assert data["accepted"] is True
        assert "kafka_sent" in data
