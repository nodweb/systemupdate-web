import httpx
import pytest
from app.main import app


@pytest.mark.asyncio
async def test_batch_run_default():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/batch/run", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("ok") is True
    assert data.get("kind") == "daily"


@pytest.mark.asyncio
async def test_stream_start_topics():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/stream/start", json={"topics": ["t1", "t2"]})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("ok") is True
    assert data.get("topics") == ["t1", "t2"]
