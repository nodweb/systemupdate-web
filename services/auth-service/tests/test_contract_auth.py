"""
Sample placeholder test for auth-service.
This keeps the CI green during development while real contract tests are
documented in docs/REAL_TESTS_PREP.md for later VPS execution.
"""

from app.main import app
from fastapi.testclient import TestClient


def test_healthz_sample():
    client = TestClient(app)
    r = client.get("/healthz")
    assert r.status_code == 200
