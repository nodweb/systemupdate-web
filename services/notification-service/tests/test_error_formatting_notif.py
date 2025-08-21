from fastapi.testclient import TestClient
import sys, pathlib
_svc_dir = pathlib.Path(__file__).resolve().parents[1]
if str(_svc_dir) not in sys.path:
    sys.path.insert(0, str(_svc_dir))
from app.main import app


def test_not_found_error_format_and_request_id_notif():
    with TestClient(app) as client:
        resp = client.get("/__this_path_does_not_exist__")
        assert resp.status_code == 404
        body = resp.json()
        assert isinstance(body, dict)
        assert "error" in body
        assert body["error"].get("code") in ("ERR_404", "NOT_FOUND")
        assert body["error"].get("message")
        assert "X-Request-ID" in resp.headers
