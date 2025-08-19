# Test Guide (SystemUpdate-Web)

[![Contract Tests](https://github.com/nodweb/systemupdate-web/actions/workflows/contract-tests.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/contract-tests.yml)
[![E2E Playwright](https://github.com/nodweb/systemupdate-web/actions/workflows/e2e-playwright.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/e2e-playwright.yml)
[![Prod Security Smoke](https://github.com/nodweb/systemupdate-web/actions/workflows/prod-security-smoke.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/prod-security-smoke.yml)
[![OPA Deny E2E](https://github.com/nodweb/systemupdate-web/actions/workflows/opa-deny-e2e.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/opa-deny-e2e.yml)
[![OPA Deny E2E (Gateway-Secure)](https://github.com/nodweb/systemupdate-web/actions/workflows/opa-deny-e2e-secure.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/opa-deny-e2e-secure.yml)
[![OPAL Sync Assertion](https://github.com/nodweb/systemupdate-web/actions/workflows/opal-sync-assert.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/opal-sync-assert.yml)
[![Gateway JWT Smoke](https://github.com/nodweb/systemupdate-web/actions/workflows/gateway-jwt-smoke.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/gateway-jwt-smoke.yml)
[![Gateway OIDC Smoke (Optional)](https://github.com/nodweb/systemupdate-web/actions/workflows/gateway-oidc-smoke.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/gateway-oidc-smoke.yml)
[![Policies CI](https://github.com/nodweb/systemupdate-policies/actions/workflows/policy-ci.yml/badge.svg)](https://github.com/nodweb/systemupdate-policies/actions/workflows/policy-ci.yml)

[![Testcontainers Integration](https://github.com/nodweb/systemupdate-web/actions/workflows/testcontainers.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/testcontainers.yml)

<!-- markdownlint-disable MD013 MD022 MD032 MD031 -->

This guide shows how to run tests for all Python services and how to use the Windows setup script.

For preparing and running full real tests (contract, integration, security) on a VPS, see:

- docs/REAL_TESTS_PREP.md

## Services
- `services/ws-hub`
- `services/auth-service`
- `services/device-service`
- `services/command-service`
- `services/analytics-service`
- `services/notification-service`

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

## E2E (Playwright)

Location: `systemupdate-web/tests/e2e/`

Install and run locally (with Docker stack running):

```powershell
cd systemupdate-web/tests/e2e
npm install
npx playwright install --with-deps chromium
npx playwright test
```

Tests included:
- `gateway-smoke.spec.ts` — health checks via gateway and minimal ingest POST
- `command-happy.spec.ts` — create command → verify → ack → verify via gateway
- `opa-deny.spec.ts` — optional; validates 403 when OPA policy denies `commands:ack`

Enable OPA deny test (PowerShell):

```powershell
docker compose --profile policy up -d opa
Set-Item Env:OPA_E2E '1'
Set-Item Env:AUTHZ_REQUIRED '1'
Set-Item Env:OPA_REQUIRED  '1'
Set-Item Env:OPA_URL       'http://localhost:8181/v1/data/systemupdate/allow'
npx playwright test tests/opa-deny.spec.ts
```

## Prod Security Smoke (Gateway-only)

This is a quick local smoke to verify the production-like Kong gateway configuration:

- Only `gateway-secure` is started.
- Admin port is disabled.
- Proxy is published on port 80.

Local run (PowerShell from `systemupdate-web/`):

```powershell
$env:COMPOSE_PROFILES="secure"
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.smoke.yml up -d --no-deps gateway-secure

# Expect 200/404 from root (route may not exist)
(Invoke-WebRequest -UseBasicParsing -Uri http://localhost/ -TimeoutSec 5).StatusCode

# Admin should NOT be reachable
try { (Invoke-WebRequest -UseBasicParsing -Uri http://localhost:8001 -TimeoutSec 3).StatusCode } catch { 'admin-off' }

# Teardown
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.smoke.yml down -v
```

In CI, the workflow `.github/workflows/prod-security-smoke.yml` starts `gateway-secure` on port 8080 and performs similar checks (status code, headers, no admin).

## Environment toggles

- `DOCKER_AVAILABLE`: Some integration tests use Testcontainers. If Docker is not available, set an env var or skip those tests as configured in each service’s tests. The default behavior in CI/dev assumes Docker is installed and running.
- Auth/AuthZ/OPA (see `docs/AUTH_GUIDE.md` for details). Typical local setup in PowerShell before running a service or pytest:

```powershell
# Enable JWT verification and authorization via auth-service
$Env:AUTH_REQUIRED = '1'
$Env:AUTHZ_REQUIRED = '1'
$Env:AUTH_INTROSPECT_URL = 'http://localhost:8001/auth/introspect'
$Env:AUTH_AUTHORIZE_URL  = 'http://localhost:8001/auth/authorize'

# Optional: enable OPA policy enforcement
$Env:OPA_REQUIRED = '1'
$Env:OPA_URL = 'http://localhost:8181/v1/data/systemupdate/allow'
$Env:OPA_TIMEOUT = '2.0'

# Optional: developer bypass for JWT during local-only testing
$Env:AUTH_DEV_ALLOW_ANY = '1'
$Env:AUTH_DEV_SCOPE = 'read write admin'

# Optional: ws-hub WebSocket smoke test token (enables minimal connect/close test)
$Env:WS_HUB_SMOKE_TOKEN = '<access_token>'
$Env:WS_HUB_SMOKE_CLIENT_ID = 'smoke-client'
```

CI Workflows:

- Contract tests (Schemathesis): `.github/workflows/contract-tests.yml`
- E2E Playwright: `.github/workflows/e2e-playwright.yml`
- Prod security smoke (gateway-only): `.github/workflows/prod-security-smoke.yml`
- OPA deny E2E (gateway + OPA): `.github/workflows/opa-deny-e2e.yml`
- OPA deny E2E (Gateway-Secure): `.github/workflows/opa-deny-e2e-secure.yml`
- OPAL sync assertion (OPA+OPAL): `.github/workflows/opal-sync-assert.yml`
- Gateway JWT Smoke: `.github/workflows/gateway-jwt-smoke.yml`
- Gateway OIDC Smoke (Optional): `.github/workflows/gateway-oidc-smoke.yml` (gated by repository variable `KONG_ENTERPRISE=1`)
- Prod Security Smoke: `.github/workflows/prod-security-smoke.yml`
- JWKS Service Smoke: `.github/workflows/jwks-service-smoke.yml`

## Testcontainers Integration CI (manual)

- Workflow: `.github/workflows/testcontainers.yml` (workflow_dispatch)
- What it does:
  - Starts shared infra (Postgres, Redis, ZooKeeper, Kafka)
  - Starts services and waits for `/healthz` on: auth (8001), ws-hub (8002), device (8003), command (8004), data-ingest (8005), analytics (8006), notification (8007)
  - Runs pytest with `-m docker` in each service folder if tests exist
  - Enforces docker-marked tests for command-service, data-ingest-service, analytics-service, and notification-service (these steps are not `continue-on-error`)
- How to write tests:
  - Use `@pytest.mark.docker` to mark tests that depend on Dockerized infra
  - Prefer stdlib for probes (e.g., `urllib.request` and `socket`) to avoid extra deps
  - Example file names:
    - `services/ws-hub/tests/test_docker_smoke.py`
    - `services/command-service/tests/test_docker_smoke.py`
    - `services/data-ingest-service/tests/test_docker_smoke.py`
    - `services/analytics-service/tests/test_docker_smoke.py`
    - `services/notification-service/tests/test_docker_smoke.py`
    - `services/device-service/tests/test_docker_smoke.py`
    - `services/auth-service/tests/test_docker_smoke.py`
  - Optional roundtrip tests:
    - DB: add `psycopg` (v3) or `psycopg2` to `services/command-service/requirements.txt` to enable the `SELECT 1` roundtrip test.
    - Kafka: add `kafka-python` to `services/data-ingest-service/requirements.txt` to enable the produce/consume test.
    - Both tests skip gracefully if dependencies/brokers are unavailable, keeping CI green.
  - Optional ws-hub WebSocket connect smoke:
    - Add `websockets` client library to `services/ws-hub/requirements.txt` (or install temporarily in CI step) to enable a minimal connect/close test.
    - Provide a token via env var `WS_HUB_SMOKE_TOKEN` (and optional `WS_HUB_SMOKE_CLIENT_ID`). If not set, the test will skip.
    - Example test file: `services/ws-hub/tests/test_websocket_smoke.py`.

## Common issues

- "Module not found": Ensure you ran from the service folder and set `PYTHONPATH='.'` before pytest.
- Docker engine not ready: Start Docker Desktop and retry tests. On first startup, it may take 1–2 minutes.
- WSL install required: If the setup script prompts for WSL install, complete Ubuntu first-run from Start Menu, then re-run with `-SkipUbuntuInstall`.

## Optional: Enable Gateway OIDC Smoke CI

- This job requires Kong Enterprise/Konnect (OIDC plugin).
- To enable in GitHub Actions:
  - Go to your GitHub repository → Settings → Secrets and variables → Actions → Variables.
  - Add a new Repository variable: `KONG_ENTERPRISE` with value `1`.
  - Re-run or trigger the workflow: `.github/workflows/gateway-oidc-smoke.yml`.

## Prod Security Smoke CI

- Brings up only the secure gateway (`gateway-secure`) using `docker-compose.prod.yml` and a CI override to publish on `8080`.
- Verifies:
  - Proxy responds on 8080 without 5xx and includes `Server: kong` header.
  - Admin API is not reachable.

## JWKS Service Smoke CI

- Starts Keycloak (`auth` profile) and a target service with JWKS verification enabled.
- Validates 401 without token and 200 with a Keycloak access token against the service OpenAPI endpoint.

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

## OPA/OPAL Troubleshooting

- Ensure OPA is healthy:
  ```bash
  curl -fsS http://localhost:8181/health
  ```
- Verify policy endpoint exists and returns a result key:
  ```bash
  curl -s -X POST http://localhost:8181/v1/data/systemupdate/allow -H 'content-type: application/json' -d '{"input": {}}'
  ```
- OPAL server health (when profile `policy` is on):
  ```bash
  curl -fsS http://localhost:7002/healthcheck
  ```
- Logs: check `opal-server`, `opal-client`, and `opa` container logs for sync events and decision logs.
