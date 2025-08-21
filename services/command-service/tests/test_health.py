import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_healthz():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/healthz")
    assert resp.status_code == 200
    assert resp.json().get("status") == "ok"
