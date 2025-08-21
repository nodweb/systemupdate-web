# ruff: noqa: E402
import os

import httpx
import pytest

try:
    from asgi_lifespan import LifespanManager  # type: ignore
except Exception:  # pragma: no cover
    LifespanManager = None  # type: ignore

# Ensure pytest gating is detected
os.environ.setdefault("PYTEST_CURRENT_TEST", "1")

from app.main import app  # noqa: E402


@pytest.mark.asyncio
async def test_producer_gated_during_pytest():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        if LifespanManager is not None:
            async with LifespanManager(app):
                r = await ac.get("/producer/status")
        else:
            r = await ac.get("/producer/status")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data.get("running"), bool)
    # During pytest, background kafka should not be running
    assert data.get("running") is False
