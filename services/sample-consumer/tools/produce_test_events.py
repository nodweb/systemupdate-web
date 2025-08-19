import asyncio
import json
import os
import uuid

from aiokafka import AIOKafkaProducer

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "command.events")


async def main() -> None:
    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP)
    await producer.start()
    try:
        cid = str(uuid.uuid4())
        payload = {
            "type": "command.created",
            "id": cid,
            "device_id": "dev-test",
            "name": "install_update",
            "payload": "{}",
            "created_at": "2024-01-01T00:00:00Z",
        }
        msg = json.dumps(payload).encode("utf-8")
        # send twice to test idempotency duplicate detection
        await producer.send_and_wait(KAFKA_TOPIC, msg)
        await producer.send_and_wait(KAFKA_TOPIC, msg)
        print(f"Sent duplicate events for id={cid}")
    finally:
        await producer.stop()


if __name__ == "__main__":
    asyncio.run(main())
