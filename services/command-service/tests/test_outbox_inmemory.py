import asyncio
import os
import pytest
import httpx

from app.main import app, on_startup, on_shutdown
import app.main as app_main


@pytest.mark.asyncio
async def test_idempotency_and_status_sent_inmemory(monkeypatch):
    # Ensure DB is not used so we run in in-memory mode
    monkeypatch.delenv("POSTGRES_DSN", raising=False)
    monkeypatch.delenv("POSTGRES_HOST", raising=False)
    # Force in-memory publisher path without Kafka
    monkeypatch.setattr(app_main, "AIOKafkaProducer", None, raising=False)

    # Manually trigger lifespan so background publisher runs
    await on_startup()
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
            # First create with idempotency key
            idem_key = "it-123"
            payload = {"device_id": "dev-it", "name": "reboot", "payload": {"force": True}}
            r1 = await ac.post("/commands", json=payload, headers={"x-idempotency-key": idem_key})
            assert r1.status_code == 201
            created1 = r1.json()
            cid = created1["id"]
            assert created1["status"] in ("queued", "sent")

            # Second call with the same idempotency key should return same command id
            r2 = await ac.post("/commands", json=payload, headers={"x-idempotency-key": idem_key})
            assert r2.status_code == 201
            created2 = r2.json()
            assert created2["id"] == cid

            # The background publisher should flip status to 'sent'. Poll a bit.
            async def _get_status():
                r = await ac.get(f"/commands/{cid}")
                assert r.status_code == 200
                return r.json()["status"]

            for _ in range(30):  # up to ~3s
                status = await _get_status()
                if status == "sent":
                    break
                await asyncio.sleep(0.1)
            else:
                pytest.fail("command status did not transition to 'sent' in time")
    finally:
        await on_shutdown()
