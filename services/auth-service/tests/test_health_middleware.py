from fastapi.testclient import TestClient

from app.main import app


def test_healthz_ok_and_request_id_header():
    with TestClient(app) as client:
        resp = client.get("/healthz")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, dict)
        assert "status" in data and "version" in data and "checks" in data
        # RequestContextMiddleware should inject a request id header
        assert "X-Request-ID" in resp.headers
