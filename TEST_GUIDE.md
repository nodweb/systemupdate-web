# SystemUpdate-Web Test & Validation Guide (Living Document)

This guide describes how to run and validate tests (unit, integration, E2E, security, performance) for the web stack. It will be updated continuously until the project is complete.

---

## 1) Prerequisites
- Windows: Install Docker Desktop (with WSL2), Git, Python 3.12 (optional), Node 20 (optional).
- Clone repo and open `systemupdate-web/` in a terminal.
- Copy env: `cp .env.example .env` (PowerShell: `Copy-Item -Path .env.example -Destination .env -Force`).

---

## 2) Start Dev Stack (Compose)
- Build and start:
  - `docker compose build`
  - `docker compose up -d`
  - `docker compose ps`
- Stop:
  - `docker compose down -v`
- Makefile (optional via Git Bash):
  - `make up`, `make logs`, `make down`

Services (so far):
- auth-service: http://localhost:8001
  - Health: `GET /healthz`
  - Introspect (stub): `POST /api/auth/introspect` { "token": "abc" }
- ws-hub: http://localhost:8002
  - WebSocket: `GET /ws?token=abc&cid=dev1` (WSS behind Traefik in prod)
  - Health: `GET /healthz`
- device-service: http://localhost:8003
  - REST CRUD + presence under `/api/devices`

---

## 2.5) Code Generation (OpenAPI)
- Python clients (generated under `libs/shared-python/clients/`):
  - Create venv and install generator deps:
    - `python -m venv .venv && .venv/Scripts/Activate.ps1`
    - `pip install -r libs/shared-python/requirements.txt`
  - Generate: `make codegen` or `make codegen-python`
- TypeScript types (generated under `libs/shared-ts/types/`):
  - `cd libs/shared-ts && npm install`
  - Generate: `npm run generate` or `make codegen-ts`

Notes:
- Specs live under `libs/proto-schemas/openapi/` (`auth.yaml`, `device.yaml`).
- Regenerate after any contract changes and commit the diff.

---

## 3) Unit Tests (Python)
- Auth service:
  - `cd services/auth-service`
  - `python -m venv .venv && .venv/Scripts/Activate.ps1` (PowerShell) or `source .venv/bin/activate` (bash)
  - `pip install -r requirements.txt`
  - `pytest -q`
- WS Hub:
  - `cd services/ws-hub`
  - `python -m venv .venv && .venv/Scripts/Activate.ps1` or `source .venv/bin/activate`
  - `pip install -r requirements.txt` (includes `python-jose[cryptography]` for JWT/JWKS tests)
  - `pytest -q`
- Device service:
  - `cd services/device-service`
  - `python -m venv .venv && .venv/Scripts/Activate.ps1` or `source .venv/bin/activate`
  - `pip install -r requirements.txt`
  - `pytest -q`
- Expected:
  - Auth: `test_healthz`, `test_introspect_*` pass.
  - WS: `test_healthz`, basic connect/echo/heartbeat tests pass.
  - Device: `test_healthz`, CRUD + presence tests pass.

New dependencies for tests & observability:
- Add to each service venv as needed: `opentelemetry-*`, `schemathesis`, `testcontainers`, `redis` (device-service).
  - Already listed in each service `requirements.txt`.

---

## 4) Integration Tests (Compose + Testcontainers)
- Will be added for Device/WS/Command services.
- Run all integration tests from monorepo root once added:
  - `make test` (alias for pytest or multi-suite runner)
- Expected:
  - Services spin Postgres/Redis/Kafka/MinIO on-demand via Testcontainers.
  - Contracts validated via Schemathesis against OpenAPI.

### 4.1) Docker-required tests
- These tests require Docker to be running:
  - `services/device-service/tests/test_integration_redis.py` (uses Testcontainers Redis)

Tips:
- If Docker is not available, you can skip Docker-based tests:
  - `pytest -q -k "not integration and not redis"`
  - Or run only unit tests in each service directory.
- You can explicitly enable Docker-based tests by setting an environment variable before running pytest:
  - PowerShell (Windows): `$env:DOCKER_AVAILABLE = '1'; pytest -q services/device-service`
  - bash: `DOCKER_AVAILABLE=1 pytest -q services/device-service`

---

## 5) WebSocket Tests (ws-hub)
- Start dev stack.
- Run `pytest -q` in `services/ws-hub/`.
- Validations:
  - Connect with valid token → accept; invalid token → reject.
  - Heartbeat ping/pong within SLA.
  - Reconnect with backoff/jitter succeeds.
  - Token binding enforced (token + connection binding).

---

## 6) Manual API Checks (curl/Postman)
- Health:
```bash
curl -s http://localhost:8001/healthz | jq
```
- Introspect (stub):
```bash
curl -s -X POST http://localhost:8001/api/auth/introspect \
  -H 'Content-Type: application/json' \
  -d '{"token":"abc"}' | jq
```
- Device CRUD quick check:
```bash
curl -s -X POST http://localhost:8003/api/devices -H 'Content-Type: application/json' -d '{"name":"alpha","tags":["t1"]}' | jq
```
- WS quick check (using wscat):
```bash
wscat -c 'ws://localhost:8002/ws?token=abc&cid=dev1'
```
- Postman collection will be added under `docs/postman/`.

---

## 7) Prod-like Stack with TLS (Traefik)
- In `.env` set:
  - `DOMAIN=your.domain.tld`
  - `LETSENCRYPT_EMAIL=you@example.com`
- Start:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
- Validate:
  - https://your.domain.tld/api/auth/introspect
  - https://your.domain.tld/api/devices
  - wss://your.domain.tld/ws
  - Traefik dashboard (lock behind IP allowlist in production).

---

## 8) Security & Quality Gates
- CI (GitHub Actions): SBOM (Syft), Trivy scan.
- Local:
  - `make sbom` (requires Syft)
  - `make scan` (requires Trivy)
- To be added:
  - CodeQL (SAST), secret scan, dependency review.
  - Policy tests (OPA) and JWT validation tests (Keycloak/JWKS).

---

## 9) Performance/Load (Later Milestones)
- k6 scenarios for API and WS flows under `tests/perf/`.
- Goals:
  - P95 latency targets per endpoint.
  - WS reconnect SLA and message delivery rate.

---

## 10) Troubleshooting
- `docker compose logs -f --tail=200`
- Ports busy: stop conflicting services or change mappings in compose.
- Docker not found (Windows): install Docker Desktop and enable WSL2 backend.

---

## 11) Change Log (keep updated)
- 2025-08-13: Initial guide created; auth-service unit tests and compose stack instructions.
- 2025-08-13: Added ws-hub and device-service sections, commands, and validations; added curl/wscat examples; Makefile test target.

---

## 12) Acceptance Checklist (expand as features land)
- [ ] Auth: OIDC/JWT validation against Keycloak (unit/integration)
- [ ] Device: CRUD + presence (unit/integration)
- [ ] WS Hub: token binding, heartbeat, reconnect (unit/integration)
- [ ] Command: create/dispatch/track + outbox (integration)
- [ ] Contracts: OpenAPI/Protobuf validated (Schemathesis/Testcontainers)
- [ ] Observability: traces/metrics/logs appear with IDs and PII redaction
- [ ] Security: SBOM, scans, policy tests, secrets management checks
