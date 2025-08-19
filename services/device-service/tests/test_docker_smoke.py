import urllib.request
import pytest

pytestmark = pytest.mark.docker


def test_healthz_ok():
    with urllib.request.urlopen("http://localhost:8003/healthz", timeout=2.0) as resp:
        assert resp.status == 200
