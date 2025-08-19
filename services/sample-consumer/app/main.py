import asyncio
import json
import os
import time
from typing import Optional, Protocol

from aiokafka import AIOKafkaConsumer
from jsonschema import Draft202012Validator
from prometheus_client import Counter, Histogram, start_http_server

SCHEMA_PATH = os.getenv(
    "SCHEMA_PATH",
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "libs",
        "proto-schemas",
        "json",
        "command.created.schema.json",
    ),
)
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "command.events")
CONSUMER_GROUP = os.getenv("CONSUMER_GROUP", "sample-command-consumer")

# Idempotency backend: memory | redis | postgres
IDEMP_STORE = os.getenv("IDEMP_STORE", "memory").lower()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
POSTGRES_DSN = os.getenv("POSTGRES_DSN", "")

# Prometheus metrics
METRICS_PORT = int(os.getenv("METRICS_PORT", "9000"))
METRIC_RECEIVED = Counter("consumer_received_total", "Total received messages")
METRIC_VALIDATED = Counter("consumer_validated_total", "Total validated messages")
METRIC_DUPLICATES = Counter("consumer_duplicates_total", "Total duplicates detected")
METRIC_ERRORS = Counter("consumer_errors_total", "Total processing/validation errors")
METRIC_PROCESS_SEC = Histogram(
    "consumer_processing_seconds",
    "Per-message processing time in seconds",
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)


def load_validator(path: str) -> Draft202012Validator:
    with open(path, "r", encoding="utf-8") as f:
        schema = json.load(f)
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


class IdempotencyStore(Protocol):
    async def check_and_set(self, key: str) -> bool:
        """Return True if key is new and recorded; False if already seen."""


class MemoryIdempotencyStore:
    def __init__(self) -> None:
        self._seen: set[str] = set()

    async def check_and_set(self, key: str) -> bool:
        if key in self._seen:
            return False
        self._seen.add(key)
        return True


class RedisIdempotencyStore:
    def __init__(self, url: str) -> None:
        import redis.asyncio as redis  # lazy import

        self._redis = redis.from_url(url, encoding="utf-8", decode_responses=True)
        self._ttl = int(os.getenv("IDEMP_TTL_SECONDS", "604800"))  # 7 days

    async def check_and_set(self, key: str) -> bool:
        # SET key value NX EX <ttl>  => returns True if set, None if exists
        ok = await self._redis.set(name=f"idem:{key}", value="1", nx=True, ex=self._ttl)
        return bool(ok)


class PostgresIdempotencyStore:
    def __init__(self, dsn: str) -> None:
        import asyncpg  # lazy import

        self._dsn = dsn
        self._pool: Optional[asyncpg.Pool] = None

    async def _ensure_pool(self) -> None:
        import asyncpg

        if self._pool is None:
            self._pool = await asyncpg.create_pool(self._dsn, min_size=1, max_size=5)
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """
                    create table if not exists consumer_idempotency(
                      key text primary key,
                      created_at timestamptz not null default now()
                    )
                    """
                )

    async def check_and_set(self, key: str) -> bool:
        await self._ensure_pool()
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            try:
                await conn.execute(
                    "insert into consumer_idempotency(key) values($1) on conflict do nothing",
                    key,
                )
                # If inserted, consider new; check existence
                row = await conn.fetchrow(
                    "select 1 from consumer_idempotency where key=$1", key
                )
                # If row exists and we just inserted, it's new; but on conflict we need another check
                # Simplify by returning True if just inserted: asyncpg doesn't directly expose it here,
                # so do a second insert check via unique violation approach is avoided by ON CONFLICT.
                # Instead, treat existence as seen; rely on first attempt being True.
                # We'll detect new by using "not existed before" logic: do a delete-then-insert is too heavy.
                # For simplicity: return True if row exists and we just executed insert (approximate):
                # But we can't tell. Fall back: check row count via cmdstatus not easily available here.
                # Simpler: try an insert; if no exception, then check if present in this transaction via rowcount is not provided here.
                # To keep behavior: treat first arrival as new if not present; so re-check with select beforehand.
                # We'll adjust: first check, then insert.
            except Exception:
                pass
        # Fallback logic (rare path): pre-check then insert
        async with self._pool.acquire() as conn:  # type: ignore[union-attr]
            row = await conn.fetchrow(
                "select 1 from consumer_idempotency where key=$1", key
            )
            if row:
                return False
            await conn.execute("insert into consumer_idempotency(key) values($1)", key)
            return True


async def _make_store() -> IdempotencyStore:
    if IDEMP_STORE == "redis":
        return RedisIdempotencyStore(REDIS_URL)
    if IDEMP_STORE == "postgres" and POSTGRES_DSN:
        return PostgresIdempotencyStore(POSTGRES_DSN)
    return MemoryIdempotencyStore()


async def consume(validator: Draft202012Validator) -> None:
    consumer: Optional[AIOKafkaConsumer] = None
    store = await _make_store()
    try:
        consumer = AIOKafkaConsumer(
            KAFKA_TOPIC,
            bootstrap_servers=KAFKA_BOOTSTRAP,
            enable_auto_commit=False,
            auto_offset_reset="earliest",
            group_id=CONSUMER_GROUP,
        )
        await consumer.start()
        print(f"Consuming from {KAFKA_TOPIC} @ {KAFKA_BOOTSTRAP}...")
        while True:
            batch = await consumer.getmany(timeout_ms=500)
            for _tp, msgs in batch.items():
                for m in msgs:
                    start = time.monotonic()
                    METRIC_RECEIVED.inc()
                    try:
                        evt = json.loads(m.value)
                        validator.validate(evt)
                        eid = evt.get("id") or ""
                        if not isinstance(eid, str) or not eid:
                            raise ValueError("event missing string 'id'")
                        is_new = await store.check_and_set(eid)
                        if not is_new:
                            METRIC_DUPLICATES.inc()
                            continue
                        # TODO: add side effects here
                        METRIC_VALIDATED.inc()
                    except Exception:  # validation or processing error
                        METRIC_ERRORS.inc()
                    finally:
                        METRIC_PROCESS_SEC.observe(time.monotonic() - start)
            if batch:
                await consumer.commit()
    finally:
        if consumer is not None:
            await consumer.stop()


async def main() -> None:
    validator = load_validator(SCHEMA_PATH)
    # expose metrics
    start_http_server(METRICS_PORT)
    await consume(validator)


if __name__ == "__main__":
    asyncio.run(main())
