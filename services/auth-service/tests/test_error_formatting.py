from fastapi.testclient import TestClient

from app.main import app


def test_validation_error_format_and_request_id():
    with TestClient(app) as client:
        # Missing required body for POST should trigger 422 with standardized format
        resp = client.post("/api/auth/introspect", json={})
        assert resp.status_code == 422
        body = resp.json()
        assert isinstance(body, dict)
        assert "error" in body and isinstance(body["error"], dict)
        assert body["error"].get("code") == "VALIDATION_ERROR"
        assert body["error"].get("message") == "Validation error"
        assert "details" in body["error"]
        assert "X-Request-ID" in resp.headers


def test_not_found_error_format_and_request_id():
    with TestClient(app) as client:
        resp = client.get("/__this_path_does_not_exist__")
        assert resp.status_code == 404
        body = resp.json()
        assert isinstance(body, dict)
        assert "error" in body
        assert body["error"].get("code") == "ERR_404" or body["error"].get("code") == "NOT_FOUND"
        assert body["error"].get("message")
        assert "X-Request-ID" in resp.headers
