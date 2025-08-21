import importlib.util
import pathlib
import sys

from fastapi.testclient import TestClient

# Safe import of app despite hyphen in directory name
_root = pathlib.Path(__file__).resolve().parents[3]
_app_path = _root / "services" / "data-ingest-service" / "app" / "main.py"
_spec = importlib.util.spec_from_file_location("_data_ingest_app", _app_path)
if _spec and _spec.loader:
    _mod = importlib.util.module_from_spec(_spec)
    sys.modules["_data_ingest_app"] = _mod
    _spec.loader.exec_module(_mod)
    app = getattr(_mod, "app")  # type: ignore
else:  # pragma: no cover
    raise ImportError("Unable to load data-ingest-service app module")


def test_ws_ingest_accepts_and_replies():
    client = TestClient(app)
    with client.websocket_connect("/ws/ingest") as ws:
        ws.send_json({"device_id": "dev-1", "kind": "metric", "data": {"cpu": 0.5}})
        data = ws.receive_json()
        assert data["accepted"] is True
        assert "kafka_sent" in data
