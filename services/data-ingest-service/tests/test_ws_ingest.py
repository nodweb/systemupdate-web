from fastapi.testclient import TestClient
from services.data-ingest-service.app.main import app  # type: ignore


def test_ws_ingest_accepts_and_replies():
    client = TestClient(app)
    with client.websocket_connect("/ws/ingest") as ws:
        ws.send_json({"device_id": "dev-1", "kind": "metric", "data": {"cpu": 0.5}})
        data = ws.receive_json()
        assert data["accepted"] is True
        assert "kafka_sent" in data
