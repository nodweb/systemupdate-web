from fastapi.testclient import TestClient
import sys, pathlib
_svc_dir = pathlib.Path(__file__).resolve().parents[1]
if str(_svc_dir) not in sys.path:
    sys.path.insert(0, str(_svc_dir))
from app.main import app


def test_healthz_ok_and_request_id_header():
    with TestClient(app) as client:
        resp = client.get("/healthz")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, dict)
        assert "status" in data and "version" in data and "checks" in data
        assert "X-Request-ID" in resp.headers
