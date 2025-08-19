import asyncio
import io
import os

import pytest

try:
    import docker  # type: ignore
    from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
    from fastavro import schemaless_reader, schemaless_writer
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


SCHEMA = {
    "type": "record",
    "name": "Telemetry",
    "fields": [
        {"name": "device_id", "type": "string"},
        {"name": "temperature", "type": ["null", "double"], "default": None},
    ],
}


def avro_encode(record: dict) -> bytes:
    buf = io.BytesIO()
    schemaless_writer(buf, SCHEMA, record)
    return buf.getvalue()


def avro_decode(data: bytes) -> dict:
    buf = io.BytesIO(data)
    return schemaless_reader(buf, SCHEMA)


@skip_if_no_docker
@pytest.mark.asyncio
async def test_kafka_avro_roundtrip():
    topic = "su-avro-topic"
    payload = {"device_id": "dev-1", "temperature": 21.5}
    encoded = avro_encode(payload)

    with KafkaContainer("confluentinc/cp-kafka:7.5.0") as kafka:
        bootstrap = kafka.get_bootstrap_server()

        producer = AIOKafkaProducer(bootstrap_servers=bootstrap)
        await producer.start()
        try:
            await producer.send_and_wait(topic, encoded)
        finally:
            await producer.stop()

        consumer = AIOKafkaConsumer(
            topic,
            bootstrap_servers=bootstrap,
            group_id="su-avro-group",
            auto_offset_reset="earliest",
            enable_auto_commit=False,
        )
        await consumer.start()
        try:
            out = None
            for _ in range(10):
                records = await consumer.getmany(timeout_ms=1000)
                for tp, batch in records.items():
                    for record in batch:
                        out = avro_decode(record.value)
                        break
                if out:
                    break
                await asyncio.sleep(0.2)
            assert out == payload
        finally:
            await consumer.stop()
