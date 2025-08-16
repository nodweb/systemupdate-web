# SystemUpdate-Web Monorepo

[![Python CI](https://github.com/nodweb/systemupdate-web/actions/workflows/python-ci.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/python-ci.yml)
[![SBOM & Security](https://github.com/nodweb/systemupdate-web/actions/workflows/sbom-security.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/sbom-security.yml)
[![Python Codegen](https://github.com/nodweb/systemupdate-web/actions/workflows/codegen-python.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/codegen-python.yml)
[![Markdown Lint](https://github.com/nodweb/systemupdate-web/actions/workflows/markdownlint.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/markdownlint.yml)

Enterprise-grade web stack for remote Android device management.

- Architecture: see `docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`
- Phases: 2 (Backend), 3 (Frontend), 4 (Infra)

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
