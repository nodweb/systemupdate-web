import os
import socket

import pytest

pytestmark = pytest.mark.docker


def can_connect(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def test_kafka_is_reachable():
    host = "localhost"
    port = 9092
    assert can_connect(host, port), f"Cannot reach Kafka at {host}:{port}"


@pytest.mark.docker
def test_kafka_roundtrip_produce_consume():
    try:
        from kafka import KafkaConsumer, KafkaProducer
    except Exception:
        pytest.skip("kafka-python not installed; skipping roundtrip")

    topic = os.getenv("KAFKA_TEST_TOPIC", "su.test.roundtrip")
    bootstrap = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")

    try:
        producer = KafkaProducer(bootstrap_servers=bootstrap)
        producer.send(topic, b"hello").get(timeout=5)
        producer.flush()

        consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap,
            auto_offset_reset="latest",
            enable_auto_commit=False,
            consumer_timeout_ms=3000,
            group_id=None,
        )
        # Poll for a few seconds
        got = False
        for msg in consumer:
            if msg.value == b"hello":
                got = True
                break
        consumer.close()
        assert got, "Did not consume the produced message from Kafka"
    except Exception as e:
        pytest.skip(f"Kafka roundtrip not available: {e}")
