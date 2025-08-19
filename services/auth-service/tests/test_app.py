from app.main import app
from fastapi.testclient import TestClient


def test_healthz_sample():
    client = TestClient(app)
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"
