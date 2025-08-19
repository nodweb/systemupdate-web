# Sample Kafka Consumer (Command Created)

This minimal consumer reads `command.events` and validates payloads against the
published JSON Schema `libs/proto-schemas/json/command.created.schema.json`.

## Quick Start (Windows PowerShell)

```powershell
cd services/sample-consumer
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt

$Env:KAFKA_BOOTSTRAP = 'localhost:9092'
$Env:KAFKA_TOPIC = 'command.events'

./.venv/Scripts/python app/main.py
```

Notes:

- Commits offsets only after successful processing.
- Add idempotent handling using `evt['id']` in the TODO section in `app/main.py`.

## Configuration

- `IDEMP_STORE`: `memory` (default) | `redis` | `postgres`
- `REDIS_URL`: e.g., `redis://localhost:6379/0`
- `POSTGRES_DSN`: e.g., `postgresql://user:pass@host:5432/db`
- `METRICS_PORT`: Prometheus exporter port (default `9000`)

Expose metrics endpoint:

```text
GET http://localhost:9000/metrics
```

## Docker / Compose

- Build and run full stack locally (Kafka, Redis, Postgres, Consumer):

```powershell
cd systemupdate-web
docker compose -f docker-compose.sample-consumer.yml up --build
```

- Switch idempotency backend:
  - Edit `docker-compose.sample-consumer.yml` and set `IDEMP_STORE` to
    `redis` or `postgres`.
  - For Postgres, ensure `POSTGRES_DSN` matches compose service.

- Metrics: visit `http://localhost:9000/metrics`.

## Monitoring (Prometheus + Grafana)

- Start monitoring alongside the stack:

```powershell
cd systemupdate-web
docker compose \
  -f docker-compose.sample-consumer.yml \
  -f docker-compose.monitoring.yml up -d --build
```

- Grafana: `http://localhost:3000` (anonymous enabled)
- Prometheus: `http://localhost:9090`
- Pre-provisioned dashboard: "Sample Consumer Metrics"

## Kubernetes (example)

- Apply manifests (adjust image/env as needed):

```bash
kubectl apply -f k8s/sample-consumer/deployment.yaml
kubectl apply -f k8s/sample-consumer/service.yaml
```

- Probes hit `/metrics` on port 9000 for readiness/liveness.
