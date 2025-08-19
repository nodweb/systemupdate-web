import asyncio
import os
import sys

# CI trigger: harmless comment to exercise self-hosted DB+Kafka workflow
import pytest

# Skip this integration test when Docker is unavailable in the environment
skip_reason = "Skipping DB/Kafka integration test: DOCKER_AVAILABLE=0"
pytestmark = pytest.mark.skipif(
    os.getenv("DOCKER_AVAILABLE", "0") == "0", reason=skip_reason
)


@pytest.mark.asyncio
async def test_outbox_db_integration_end_to_end(monkeypatch):
    # On Windows, psycopg requires WindowsSelectorEventLoopPolicy
    if sys.platform.startswith("win"):
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        except Exception:
            pass
    # Quick check: Docker daemon must be reachable
    try:
        import docker  # type: ignore

        _client = docker.from_env()
        # this will raise if daemon not reachable
        _ = _client.version()
    except Exception as e:  # pragma: no cover - environment dependent
        pytest.skip(f"Docker daemon unavailable: {e}")

    # Import testcontainers lazily to avoid import errors when skipped
    import httpx
    from aiokafka import AIOKafkaConsumer
    from testcontainers.kafka import KafkaContainer
    from testcontainers.postgres import PostgresContainer

    # Start Postgres and Kafka
    with PostgresContainer("postgres:15") as pg, KafkaContainer(
        "confluentinc/cp-kafka:7.5.0"
    ) as kfk:
        pg.start()
        kfk.start()

        # Configure env for the FastAPI app to use these containers
        jdbc = pg.get_connection_url()
        # jdbc like postgresql+psycopg://test:test@0.0.0.0:5432/test
        # Convert to psycopg URL
        psy_url = jdbc.replace("postgresql+psycopg://", "postgresql://").replace(
            "postgresql+psycopg2://", "postgresql://"
        )
        bootstrap = kfk.get_bootstrap_server()

        monkeypatch.setenv("POSTGRES_DSN", psy_url)
        monkeypatch.setenv("KAFKA_BOOTSTRAP", bootstrap)

        # Import app after env set
        from app.main import app, on_shutdown, on_startup

        # Start app background tasks
        await on_startup()
        try:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport, base_url="http://test"
            ) as ac:
                payload = {
                    "device_id": "dev-db",
                    "name": "install_update",
                    "payload": {"version": "1.2.3"},
                }
                r = await ac.post("/commands", json=payload)
                assert r.status_code == 201
                cid = r.json()["id"]

                # Consume from Kafka and verify event id matches
                consumer = AIOKafkaConsumer(
                    "command.events",
                    bootstrap_servers=bootstrap,
                    enable_auto_commit=False,
                    auto_offset_reset="earliest",
                    # Unique group id per test run
                    group_id=f"test-{cid}",
                )
                await consumer.start()
                try:
                    matched = False
                    # poll up to ~10 seconds
                    for _ in range(20):
                        msgs = await consumer.getmany(timeout_ms=500)
                        for tp, batch in msgs.items():
                            for m in batch:
                                # payload is JSON bytes
                                import json

                                evt = json.loads(m.value.decode("utf-8"))
                                if (
                                    evt.get("id") == cid
                                    and evt.get("type") == "command.created"
                                ):
                                    matched = True
                                    break
                            if matched:
                                break
                        if matched:
                            break
                    assert matched, "did not receive command.created event from Kafka"
                finally:
                    await consumer.stop()

                # Poll command until status becomes 'sent'
                async def _status():
                    rr = await ac.get(f"/commands/{cid}")
                    assert rr.status_code == 200
                    return rr.json()["status"]

                for _ in range(40):  # up to ~4s
                    if await _status() == "sent":
                        break
                    await asyncio.sleep(0.1)
                else:
                    pytest.fail("command did not transition to 'sent' in DB mode")
        finally:
            await on_shutdown()
