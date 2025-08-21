import urllib.request

import pytest

pytestmark = pytest.mark.docker


def test_healthz_ok():
    with urllib.request.urlopen("http://localhost:8007/health", timeout=2.0) as resp:
        assert resp.status == 200


def test_openapi_available():
    with urllib.request.urlopen(
        "http://localhost:8007/openapi.json", timeout=2.0
    ) as resp:
        assert resp.status == 200
