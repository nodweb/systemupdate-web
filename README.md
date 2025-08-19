# SystemUpdate-Web Monorepo

<!-- markdownlint-disable MD013 MD032 -->

[![Python CI](https://github.com/nodweb/systemupdate-web/actions/workflows/python-ci.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/python-ci.yml)
[![SBOM & Security](https://github.com/nodweb/systemupdate-web/actions/workflows/sbom-security.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/sbom-security.yml)
[![Python Codegen](https://github.com/nodweb/systemupdate-web/actions/workflows/codegen-python.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/codegen-python.yml)
[![Markdown Lint](https://github.com/nodweb/systemupdate-web/actions/workflows/markdownlint.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/markdownlint.yml)
[![Python Lint](https://github.com/nodweb/systemupdate-web/actions/workflows/python-lint.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/python-lint.yml)
[![TS Lint](https://github.com/nodweb/systemupdate-web/actions/workflows/ts-lint.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/ts-lint.yml)
[![Frontend CI/Lint](https://github.com/nodweb/systemupdate-web/actions/workflows/frontend-lint.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/frontend-lint.yml)
[![Schemas Validate](https://github.com/nodweb/systemupdate-web/actions/workflows/schemas-validate.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/schemas-validate.yml)
[![Proto Validate](https://github.com/nodweb/systemupdate-web/actions/workflows/proto-validate.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/proto-validate.yml)
[![CodeQL](https://github.com/nodweb/systemupdate-web/actions/workflows/codeql.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/codeql.yml)
[![Secret Scan](https://github.com/nodweb/systemupdate-web/actions/workflows/secrets.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/secrets.yml)

Enterprise-grade web stack for remote Android device management.

- Architecture: see `docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`
- Phases: 2 (Backend), 3 (Frontend), 4 (Infra)

## Docs

- Command events: `docs/EVENTS.md`
- Idempotency usage: `docs/IDEMPOTENCY.md`

## Getting Started (M0)

- Local dev via Docker Compose (to be added in M0)
- CI: GitHub Actions (lint/test/build) (placeholder)

### Frontend Quick Start

From `systemupdate-web/frontend/`:

```bash
npm install
npm run dev
```

Build/typecheck/lint in CI via `frontend-ci.yml`.

Local scripts:

```bash
npm run typecheck
npm run lint
npm run format:check
```

CI workflow for frontend lint/typecheck: `.github/workflows/frontend-lint.yml`.

### Dev Gateway & Proxy

- See `docs/DEV_GATEWAY.md` for Traefik routing (`/api/*`) and Vite proxy usage with curl examples.

## Schemas (Contracts)

- Location: `libs/proto-schemas/`
  - Avro: `libs/proto-schemas/avro/`
  - Protobuf: `libs/proto-schemas/proto/`
- CI Validation:
  - Avro: `.github/workflows/schemas-validate.yml` (fastavro)
  - Protobuf: `.github/workflows/proto-validate.yml` (protoc)
  - Note: Local Schema Registry available via Compose at `http://localhost:8081` (Confluent)

### Codegen

- CI codegen (artifacts only): `.github/workflows/proto-codegen.yml`
  - TS types → `generated/ts/`
  - Python types → `generated/python/`
  - Artifact name: `proto-generated-types`
- Local codegen (from `systemupdate-web/`):

```bash
# prerequisites
# - protoc installed on PATH
# - Node 18/20 and ts-proto installed globally: npm i -g ts-proto
python scripts/codegen/proto_codegen.py
```

Fetch CI artifact locally (from `systemupdate-web/`):

```bash
# env vars required:
#   GH_REPO=nodweb/systemupdate-web
#   GH_TOKEN=<your token with repo read>
python scripts/codegen/fetch_codegen_artifact.py
# outputs extracted into generated/
```

Client scaffolds:
- TS: `libs/client-ts/` (readme only; use outputs in `generated/ts`)
- Python: `libs/client-py/` (readme only; use outputs in `generated/python`)

## Kafka / Testcontainers Notes

- Some integration tests use Testcontainers and require Docker running.
- Example tests (data-ingest-service):
  - `tests/test_kafka_integration.py` (produce/consume bytes)
  - `tests/test_kafka_avro_roundtrip.py` (Avro schemaless encode/decode via `fastavro`)
- Toggle skip via env: `DOCKER_AVAILABLE=0` to skip on limited runners.

## Local Services (Compose)

- Postgres: `localhost:5432` (user/pass/db: systemupdate)
- Redis: `localhost:6379`
- Kafka: `localhost:9092` (Bitnami)
- Schema Registry: `http://localhost:8081` (Confluent)
- MinIO: `http://localhost:9000` (console: `http://localhost:9001`, user/pass: minioadmin)

All have basic healthchecks; see `docker-compose.yml` for details.

## Observability (OTel + Prometheus + Grafana)

- Components:
  - OpenTelemetry Collector: OTLP gRPC `localhost:4317`, OTLP HTTP `localhost:4318`
  - Prometheus: `http://localhost:9090` (scrapes OTel Collector metrics at `otel-collector:8889`)
  - Grafana: `http://localhost:3000` (admin/admin by default)
- Collector config: `observability/otel-collector-config.yaml`
- Prometheus config: `observability/prometheus.yml`

Quickstart (from `systemupdate-web/`):

```powershell
docker compose up -d otel-collector prometheus grafana
```

Next, configure backend services to export OTLP traces/metrics to the collector. Defaults can point to `otel-collector:4317` (gRPC) or `:4318` (HTTP) inside Compose.

## Quality Gates

- Linters & Formatters: ruff + ruff-format + isort, ESLint + Prettier
- Type Checking: mypy (strict-ish), TS strict mode (noImplicitAny, exactOptional, uncheckedIndex)
- Pre-commit: `.pre-commit-config.yaml` available; run `pre-commit install`
- Container Security: Trivy configured with `.trivyignore` (policy-based ignores, thresholds TBD)
- SBOM: Generated; signing (Cosign) wiring prepared in CI (to be enabled)

## Backend APIs (M0/M1)

### Command Service (`services/command-service`)

- `GET /healthz`
- `POST /commands` → create command (in-memory store)
- `GET /commands` → list commands
- `GET /commands/{id}` → get one

Env:
- `KAFKA_BOOTSTRAP` (default `kafka:9092`)
- `COMMAND_EVENTS_TOPIC` (default `command.events`)

Notes:
- Simple Outbox queue + background Kafka publisher (aiokafka). If `aiokafka` not available, events are drained no-op.
- Optional OpenTelemetry tracing to console if `opentelemetry-sdk` present.

### Data Ingest Service (`services/data-ingest-service`)

- `GET /healthz`
- `POST /ingest` → accepts JSON and (optionally) publishes to Kafka
- `WS /ws/ingest` → accepts JSON messages over WebSocket and (optionally) publishes to Kafka

Env:
- `KAFKA_BOOTSTRAP` (default `kafka:9092`)
- `INGEST_TOPIC` (default `device.ingest.raw`)

## Quick Local Testing

- Aggregate tests from repo root (using auth-service venv Python):

```powershell
services\auth-service\.venv\Scripts\python -m pytest -q
```

- Per-service quick run:

```powershell
# Auth Service
$env:PYTHONPATH='.'; pushd services/auth-service; .\.venv\Scripts\pytest -q; popd

# Device Service
$env:PYTHONPATH='.'; pushd services/device-service; .\.venv\Scripts\pytest -q; popd

# WS Hub
$env:PYTHONPATH='.'; pushd services/ws-hub; .\.venv\Scripts\pytest -q; popd
```

More details: `docs/TEST_GUIDE.md`.

## Gateway (Traefik) Notes

- Static config: `traefik/traefik.yml` (loads dynamic from `/etc/traefik/dynamic`)
- Dynamic sample routes/services: `traefik/dynamic/sample.yml`
- In Compose prod, Traefik mounts `traefik/dynamic/` to `/etc/traefik/dynamic`.

## Milestones

- M0: Scaffold + CI + local dev
- M1: Auth + API Gateway + Device + WS Hub v1
- M2: Command + Android integration + Outbox
- M3: Data Ingest + Analytics minimal
- M4: Notifications + OPA + Audit
- M5: Scale-out + Canary + Load/Chaos

<!-- markdownlint-enable MD013 MD032 -->
