# Test Guide (SystemUpdate-Web)

<!-- markdownlint-disable MD013 MD022 MD032 MD031 -->

This guide shows how to run tests for all Python services and how to use the Windows setup script.

For preparing and running full real tests (contract, integration, security) on a VPS, see:

- docs/REAL_TESTS_PREP.md

## Services
- `services/ws-hub`
- `services/auth-service`
- `services/device-service`

## Quick start with automation (Windows)
Use the setup script to create venvs, install dependencies, and optionally run tests.

```powershell
# From anywhere, full path
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\UC\AndroidStudioProjects\SystemUpdate\systemupdate-web\scripts\windows\setup-dev.ps1"

# From repo root (relative)
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/setup-dev.ps1
```

### Flags
- `-NoTests` (alias of `-SkipTests`): Do not run pytest after installing dependencies.
- `-Only "svc1,svc2"`: Only process selected services (`ws-hub`, `auth-service`, `device-service`).
- `-SkipUbuntuInstall`: Skip WSL distro installation if already completed.

Examples:
```powershell
# Only ws-hub and device-service, skip tests
powershell -NoProfile -ExecutionPolicy Bypass -File "...\scripts\windows\setup-dev.ps1" -Only "ws-hub,device-service" -NoTests
```

## Run tests manually (per service)
From service folder:
```powershell
# ws-hub
cd services/ws-hub
$env:PYTHONPATH='.'; .\.venv\Scripts\pytest -q

# auth-service
cd services/auth-service
$env:PYTHONPATH='.'; .\.venv\Scripts\pytest -q

# device-service
cd services/device-service
$env:PYTHONPATH='.'; .\.venv\Scripts\pytest -q
```

## Environment toggles

- `DOCKER_AVAILABLE`: Some integration tests use Testcontainers. If Docker is not available, set an env var or skip those tests as configured in each service’s tests. The default behavior in CI/dev assumes Docker is installed and running.

## Common issues

- "Module not found": Ensure you ran from the service folder and set `PYTHONPATH='.'` before pytest.
- Docker engine not ready: Start Docker Desktop and retry tests. On first startup, it may take 1–2 minutes.
- WSL install required: If the setup script prompts for WSL install, complete Ubuntu first-run from Start Menu, then re-run with `-SkipUbuntuInstall`.

## Notes

- The codebase uses contract tests (Schemathesis) and may pull OpenAPI/AsyncAPI specs from `libs/proto-schemas/`.
- ws-hub uses async websocket tests; ensure dependencies from `requirements.txt` are installed.

## Frontend Quick Start

Location: `systemupdate-web/frontend/`

```bash
npm install
npm run dev
```

- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Build: `npm run build`

CI builds/lints via `systemupdate-web/.github/workflows/frontend-ci.yml`.

## Schemas Validation (Local)

- One-shot helper (Windows PowerShell):

```powershell
cd systemupdate-web
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-schemas.ps1
```

- Avro (requires Python and fastavro):

```bash
cd systemupdate-web
python - << 'PY'
import sys, glob
from fastavro.schema import load_schema
paths = glob.glob('libs/proto-schemas/avro/**/*.avsc', recursive=True)
print('Found', len(paths), 'Avro files')
for p in paths:
    load_schema(p)
    print('OK:', p)
PY
```

- Protobuf (requires `protoc` in PATH):

```bash
cd systemupdate-web
for f in $(ls libs/proto-schemas/proto/**/*.proto); do
  echo "Validating $f" && protoc --proto_path=libs/proto-schemas/proto --descriptor_set_out=/dev/null "$f";
done
```

## Proto Codegen (Local)

From `systemupdate-web/`:

```bash
# prerequisites:
# - protoc in PATH
# - Node 18/20 and ts-proto installed: npm i -g ts-proto
python scripts/codegen/proto_codegen.py
# outputs:
#   generated/ts
#   generated/python
```

## Kafka / Testcontainers Tests (Local)

Docker must be running. From `services/data-ingest-service/`:

```powershell
$env:PYTHONPATH='.'; .\.venv\Scripts\pytest -q tests/test_kafka_integration.py
$env:PYTHONPATH='.'; .\.venv\Scripts\pytest -q tests/test_kafka_avro_roundtrip.py
```

Troubleshooting:
- Set `DOCKER_AVAILABLE=0` to skip on environments without Docker.
- First Docker start may take 1–2 minutes; re-run tests after engine is ready.

## Integration Tests: Command Service (DB + Kafka)

Location: `services/command-service/`

This test spins up Postgres and Kafka via Testcontainers, posts a command,
consumes the `command.created` event from Kafka, and verifies the status
transition to `sent`.

Prerequisites:
- Docker Desktop running and healthy
- Python venv with service requirements installed

Run (Windows PowerShell):

```powershell
cd services/command-service
Set-Item Env:PYTHONPATH '.'
Set-Item Env:DOCKER_AVAILABLE '1'
pytest -q tests/test_outbox_db_integration.py -q
```

Notes:
- If Docker daemon is not reachable, the test will be skipped automatically
  with a clear message.
- On Windows, the test sets the proper asyncio policy for psycopg, so no
  extra action is required.

## Sample Kafka Consumer (JSON Schema validation)

Location: `services/sample-consumer/`

```powershell
cd services/sample-consumer
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt

# Adjust if Kafka is not localhost, or when running against containers
$Env:KAFKA_BOOTSTRAP = 'localhost:9092'
$Env:KAFKA_TOPIC = 'command.events'

./.venv/Scripts/python app/main.py
```

Notes:
- Validates messages against `libs/proto-schemas/json/command.created.schema.json`.
- Commits offsets only after successful processing.

### Producer tool (send duplicates for idempotency testing)

```powershell
cd systemupdate-web
python services/sample-consumer/tools/produce_test_events.py --bootstrap localhost:9092 --topic command.events --count 5 --duplicates 2
```

### Monitoring stack (Prometheus + Grafana)

```powershell
cd systemupdate-web
docker compose -f docker-compose.sample-consumer.yml -f docker-compose.monitoring.yml up -d --build
# Metrics:     http://localhost:9000/metrics
# Prometheus:  http://localhost:9090
# Grafana:     http://localhost:3000 (dashboard: "Sample Consumer Metrics")
```

### Publish and pull the consumer image (GHCR)

CI workflow: `.github/workflows/sample-consumer-publish.yml` builds and pushes tags:

- `ghcr.io/<org-or-user>/sample-consumer:sha-<sha>`
- `ghcr.io/<org-or-user>/sample-consumer:<branch>`
- `ghcr.io/<org-or-user>/sample-consumer:latest` (default branch only)

Pull locally:

```powershell
docker pull ghcr.io/<org-or-user>/sample-consumer:latest
docker run --rm -e KAFKA_BOOTSTRAP=host.docker.internal:9092 -e KAFKA_TOPIC=command.events -e CONSUMER_GROUP=demo -e METRICS_PORT=9000 -p 9000:9000 ghcr.io/<org-or-user>/sample-consumer:latest
```

### Kubernetes deployment using published image

Edit `k8s/sample-consumer/deployment.yaml` and set:

```yaml
        image: ghcr.io/<org-or-user>/sample-consumer:latest
```

Apply:

```bash
kubectl apply -f k8s/sample-consumer/deployment.yaml
kubectl apply -f k8s/sample-consumer/service.yaml
```

## Acceptance Checklist (Testing)

- [ ] Per-service minimal tests pass locally (`pytest -q`) with `PYTHONPATH='.'` from the service folder
- [ ] Aggregate tests pass from monorepo root using `pytest.ini`
- [ ] TypeScript OpenAPI types generated in `libs/shared-ts/types/`
- [ ] Python OpenAPI clients generated in `libs/shared-python/clients/`
- [ ] VPS test prep completed per `docs/REAL_TESTS_PREP.md` (Docker, Traefik, OIDC)
- [ ] Contract tests validated (Schemathesis against app or HTTP endpoint)
- [ ] Docker/Testcontainers-based integration tests pass on VPS

<!-- markdownlint-enable MD013 MD022 MD032 MD031 -->
