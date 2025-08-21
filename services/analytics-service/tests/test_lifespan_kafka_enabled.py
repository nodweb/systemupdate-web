import asyncio
from unittest.mock import patch

import httpx
import pytest

from app.main import app


class _StubAIOKafkaConsumer:
    def __init__(self, *topics, **kwargs):
        self.started = False
        self.stopped = False

    async def start(self):
        await asyncio.sleep(0)
        self.started = True

    async def stop(self):
        await asyncio.sleep(0)
        self.stopped = True

    def __aiter__(self):
        async def _gen():
            # yield a few noop iterations, then keep waiting until cancelled
            while True:
                await asyncio.sleep(0.01)
                yield type("_Msg", (), {"value": b"{}"})

        return _gen()


@pytest.mark.asyncio
async def test_lifespan_with_kafka_enabled(monkeypatch):
    # Enable consumption path and allow startup (unset pytest gating)
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setenv("ANALYTICS_CONSUME_ENABLED", "true")

    # Patch AIOKafkaConsumer used by app.main
    monkeypatch.setenv("KAFKA_BOOTSTRAP", "kafka:9092")
    with patch("app.main.AIOKafkaConsumer", _StubAIOKafkaConsumer):
        try:
            from asgi_lifespan import LifespanManager  # type: ignore
        except Exception:
            pytest.skip(
                "asgi_lifespan is not installed; skipping lifespan startup test"
            )

        async with LifespanManager(app):
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport, base_url="http://test"
            ) as ac:
                # trigger app startup by performing a request
                # then poll briefly to allow background task to set running flag
                async def poll_running():
                    for _ in range(20):  # up to ~1s total
                        resp = await ac.post(
                            "/stream/start", json=["device.ingest.raw"]
                        )
                        assert resp.status_code == 200
                        body = resp.json()
                        if body.get("running") is True:
                            return True
                        await asyncio.sleep(0.05)
                    return False

                assert await poll_running() is True
        # On exit, lifespan shutdown should cancel and stop the consumer without errors.
