# Command Service Events

- Topic: `command.events`
- Encoding: JSON (UTF-8)
- Producer: `command-service`
- Transport: Kafka (`KAFKA_BOOTSTRAP`)

## Event: command.created

- kind/type: `command.created`
- aggregate_id: command `id`
- Schema (informal):
  - `id` (string): Command ID (e.g., `cmd-<8hex>`)
  - `device_id` (string)
  - `name` (string)
  - `payload` (object|null)
  - `created_at` (RFC3339 string, UTC)

Formal JSON Schema:

- Path: `libs/proto-schemas/json/command.created.schema.json`
- Purpose: Validation for producers/consumers to ensure contract compliance.

Avro Schema:

- Path: `libs/proto-schemas/avro/command_created_v1.avsc`
- Validate locally (Python):

```bash
python - << 'PY'
from fastavro.schema import load_schema
load_schema('libs/proto-schemas/avro/command_created_v1.avsc')
print('OK: command_created_v1.avsc')
PY
```

Example:

```json
{
  "type": "command.created",
  "id": "cmd-1a2b3c4d",
  "device_id": "dev-xyz",
  "name": "reboot",
  "payload": {"force": true},
  "created_at": "2025-01-01T12:00:00+00:00"
}
```

## Delivery Semantics

- At-least-once from outbox to Kafka.
- Consumers must be idempotent by `id`.

## Versioning

- Backward-compatible field additions.
- Breaking changes require a new `type` (e.g., `command.v2.created`) or topic.

## Operational Notes

- In DB mode, events are stored in `outbox` and marked `sent_at` upon successful
  publish; command `status` transitions to `sent`.
- In in-memory fallback (no DB), events are queued in-process. If Kafka is
  unavailable, status is still transitioned to `sent` after dequeue.

## Consumer Best Practices

- Use the event `id` as the idempotency key; discard duplicates.
- Commit offsets only after processing and side effects complete.
- Implement retry with bounded backoff; park poison messages in a DLQ/topic.
- Validate payloads against the published JSON Schema to catch drift.

Minimal Python consumer with JSON Schema validation:

<!-- markdownlint-disable MD013 -->
```python
import asyncio, json
from aiokafka import AIOKafkaConsumer
from jsonschema import Draft202012Validator

# Load schema once
schema = json.load(open(
    'libs/proto-schemas/json/command.created.schema.json',
    'r', encoding='utf-8'
))
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema)

async def main():
    consumer = AIOKafkaConsumer(
        'command.events',
        bootstrap_servers='localhost:9092',
        enable_auto_commit=False,
        auto_offset_reset='earliest',
        group_id='command-created-consumers',
    )
    await consumer.start()
    try:
        while True:
            batch = await consumer.getmany(timeout_ms=500)
            for _tp, msgs in batch.items():
                for m in msgs:
                    evt = json.loads(m.value)
                    validator.validate(evt)
                    # TODO: process event idempotently by evt['id']
            # Commit after successful processing
            await consumer.commit()
    finally:
        await consumer.stop()

asyncio.run(main())
```
<!-- markdownlint-enable MD013 -->
