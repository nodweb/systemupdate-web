import pytest
import httpx

from app.main import app, on_startup, on_shutdown


@pytest.mark.asyncio
async def test_ack_command_inmemory(monkeypatch):
    # Ensure in-memory mode (no DB)
    monkeypatch.delenv("POSTGRES_DSN", raising=False)
    monkeypatch.delenv("POSTGRES_HOST", raising=False)

    await on_startup()
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
            # Create a command
            r = await ac.post(
                "/commands",
                json={"device_id": "dev-ack", "name": "noop", "payload": None},
            )
            assert r.status_code == 201
            cid = r.json()["id"]

            # Ack it
            r2 = await ac.patch(f"/commands/{cid}/ack")
            assert r2.status_code == 204

            # Verify status
            r3 = await ac.get(f"/commands/{cid}")
            assert r3.status_code == 200
            assert r3.json()["status"] == "acked"
    finally:
        await on_shutdown()
