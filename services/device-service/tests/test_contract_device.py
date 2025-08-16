"""
Sample placeholder test for device-service; real contract tests will run on VPS.
See docs/REAL_TESTS_PREP.md.
"""

from starlette.testclient import TestClient
from app.main import app


def test_healthz_sample():
    client = TestClient(app)
    r = client.get("/healthz")
    assert r.status_code == 200
