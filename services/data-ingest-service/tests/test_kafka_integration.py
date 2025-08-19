import asyncio
import os

import pytest

try:
    import docker  # type: ignore
    from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
    from testcontainers.kafka import KafkaContainer  # type: ignore

    _DOCKER_CLIENT = docker.from_env()
    _DOCKER_AVAILABLE = True
    try:
        _DOCKER_CLIENT.ping()
    except Exception:
        _DOCKER_AVAILABLE = False
except Exception:
    _DOCKER_AVAILABLE = False

skip_reason = "Docker/Testcontainers not available on this runner"
skip_if_no_docker = pytest.mark.skipif(
    not _DOCKER_AVAILABLE or os.environ.get("DOCKER_AVAILABLE") == "0",
    reason=skip_reason,
)


@skip_if_no_docker
@pytest.mark.asyncio
async def test_kafka_produce_consume_roundtrip():
    topic = "su-test-topic"
    message = b"hello-kafka"

    with KafkaContainer("confluentinc/cp-kafka:7.5.0") as kafka:
        bootstrap = kafka.get_bootstrap_server()

        producer = AIOKafkaProducer(bootstrap_servers=bootstrap)
        await producer.start()
        try:
            await producer.send_and_wait(topic, message)
        finally:
            await producer.stop()

        consumer = AIOKafkaConsumer(
            topic,
            bootstrap_servers=bootstrap,
            group_id="su-test-group",
            auto_offset_reset="earliest",
            enable_auto_commit=False,
        )
        await consumer.start()
        try:
            # attempt to poll for the message
            msg = None
            for _ in range(10):
                records = await consumer.getmany(timeout_ms=1000)
                for tp, batch in records.items():
                    for record in batch:
                        msg = record.value
                        break
                if msg:
                    break
                await asyncio.sleep(0.2)
            assert msg == message
        finally:
            await consumer.stop()
