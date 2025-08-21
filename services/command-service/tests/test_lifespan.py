import os
import sys
from pathlib import Path
import asyncio
import httpx
import pytest

try:
    from asgi_lifespan import LifespanManager  # type: ignore
except Exception:  # pragma: no cover
    LifespanManager = None  # type: ignore

# Ensure import path for service package when running standalone
_tests_dir = Path(__file__).resolve().parent
_service_root = _tests_dir.parent
sr = str(_service_root)
if sr in sys.path:
    sys.path.remove(sr)
sys.path.insert(0, sr)

from app.main import app  # noqa: E402


@pytest.mark.asyncio
async def test_publisher_not_running_during_pytest_and_status_endpoint():
    # PYTEST_CURRENT_TEST is set by pytest; assert gating prevents background start
    transport = httpx.ASGITransport(app=app)

    async def check_status():
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
            r = await ac.get("/publisher/status")
            assert r.status_code == 200
            data = r.json()
            assert data.get("ok") is True
            # During tests, background publisher should be gated off
            assert data.get("running") is False

    if LifespanManager is not None:
        # Ensure lifespan is entered cleanly; still should not start publisher due to gating
        async with LifespanManager(app):
            await check_status()
    else:
        # Fallback: without lifespan manager, just call status endpoint
        await check_status()
