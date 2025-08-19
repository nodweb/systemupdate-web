"""
Sample placeholder test for device-service; real contract tests will run on VPS.
See docs/REAL_TESTS_PREP.md.
"""

from app.main import app
from starlette.testclient import TestClient


def test_healthz_sample():
    client = TestClient(app)
    r = client.get("/healthz")
    assert r.status_code == 200
