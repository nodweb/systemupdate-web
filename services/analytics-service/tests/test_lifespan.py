import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_lifespan_does_not_start_consumer_in_pytest():
    """
    With PYTEST_CURRENT_TEST set by pytest, the service lifespan should skip
    starting the Kafka consumer. The /stream/start endpoint reports the
    consumer running state via internal _state; it should be False in tests.
    """
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/stream/start", json=["device.ingest.raw"])
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("ok") is True
    assert body.get("running") is False
