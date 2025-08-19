import importlib.util
from pathlib import Path

from fastapi.testclient import TestClient

# Dynamically load app.main because the package directory has a hyphen
APP_MAIN = Path(__file__).resolve().parents[1] / "app" / "main.py"
spec = importlib.util.spec_from_file_location("ingest_main", APP_MAIN)
ingest_main = importlib.util.module_from_spec(spec)  # type: ignore
assert spec and spec.loader
spec.loader.exec_module(ingest_main)  # type: ignore

app = ingest_main.app
client = TestClient(app)


def test_http_ingest_disallowed_kind(monkeypatch):
    # Only allow 'metric'
    monkeypatch.setattr(ingest_main, "ALLOWED_KINDS", ["metric"], raising=False)

    resp = client.post(
        "/ingest",
        json={"device_id": "d1", "kind": "log", "data": {"m": 1}},
    )
    assert resp.status_code == 422
    assert "not allowed" in resp.json()["detail"]


def test_http_ingest_payload_too_large(monkeypatch):
    # Set a tiny cap
    monkeypatch.setattr(ingest_main, "MAX_BYTES", 32, raising=False)

    big = {"k": "x" * 1024}
    resp = client.post(
        "/ingest",
        json={"device_id": "d1", "kind": "metric", "data": big},
    )
    assert resp.status_code == 413
    assert resp.json()["detail"] == "payload too large"
