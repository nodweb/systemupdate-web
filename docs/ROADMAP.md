# Role and Context

By the end of this project,You are a Senior Software Architect and Full-Stack Engineer specializing in:
- Microservices architecture and distributed systems design
- Python (FastAPI) and TypeScript/React ecosystems
- DevOps, Docker, Kubernetes, and CI/CD pipelines
- Security (OIDC, JWT, OPA/OPAL, Zero Trust Architecture)
- API Gateway design and Event-Driven Architecture
- Performance optimization and scalability patterns

We are working on the SystemUpdate-Web project.

# SystemUpdate-Web Roadmap

This roadmap prioritizes and sequences the remaining work based on `docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`. Each item includes scope, rationale, dependencies, and acceptance criteria. Use it to plan M0→M2.

> Reality Check Update (2025-08-18)
> Based on the latest audit and repo snapshot, several items marked high-progress lack runnable service scaffolds or CI signals. This section adds short, actionable priorities to align plan ↔ codebase.

## Overall Progress
- Backend services minimal runnable scaffolds with `/healthz`: ~35% (directories exist; apps/Dockerfiles missing in snapshot)
- Security (OIDC/JWT + OPA toggles): ~50% (gateway JWT/OIDC disabled; OPA/OPAL profiles present without e2e signal)
- Docs: 80% (some Traefik references; Kong is active gateway)
- Infra: Compose datastores/observability present; `compose.merged.yml` contains machine-specific absolute paths; secure gateway (admin disabled) profile exists

Overall web backend platform completion: ~45% complete / ~55% remaining

## Guiding Principles

- Security-first with backward compatibility via env toggles.
- Small, testable increments; CI green at every step.
- Shared libs and conventions across services.

## P0/P1 Additions (2025-08-18)

- __P0: Service Health & Dev Correctness__
  - Add `/healthz` endpoints and compose `healthcheck` for all services; fix `gateway` `depends_on: service_healthy` by adding `auth-service` healthcheck.
  - Remove or regenerate `compose.merged.yml` to avoid absolute Windows paths; rely on `docker-compose.yml` with relative contexts.
  - Align docs to Kong; mark Traefik notes deprecated; add Vite proxy and curl examples.
- __P1: Security & Signals__
  - Enable route-level JWT via Keycloak JWKS in `gateway/kong.yml` behind `AUTH_REQUIRED=1`.
  - Wire OPA decision logs and gateway allow/deny demo; document OPAL Git sync.
  - Add ws-hub WebSocket connect smoke in CI gated by `WS_HUB_SMOKE_TOKEN` and `WS_HUB_SMOKE_CLIENT_ID`.
  - Scaffold `frontend/` (Vite + React + TS + MUI) proxied to Kong with at least Dashboard/Devices/Commands.

> CI Guardrails & Gateway Readiness (New)
> - CI now enforces Docker Compose validity and rejects absolute Windows paths.
> - `auth-service` healthcheck existence is asserted in CI to keep `depends_on: service_healthy` reliable.
> - JWT smoke workflow is scaffolded to probe `/healthz` and an auth stub; enable via repo secrets/vars.

### Acceptance for P0/P1 Additions

- [ ] P0: `/healthz` returns 200 for all services within 30s and `gateway` no longer blocks on missing health.
- [ ] P0: `docker compose up` has no absolute path bind-mount errors; `compose.merged.yml` removed or regenerated without machine-specific paths.
- [ ] P0: Docs reference Kong only; Traefik references moved to a Legacy section; quickstart curl and Vite proxy snippets present.
- [ ] P0: With `AUTH_REQUIRED=1`, protected route returns 401 without JWT and 200 with a valid Keycloak JWT (JWKS verified by Kong).
- [ ] P1: `frontend/` Vite app proxies to Kong; basic pages render and can fetch via `/api/*` with dev CORS.
- [ ] P1: CI `ws-hub-smoke` job connects (101 upgrade) and exchanges a ping/pong using `WS_HUB_SMOKE_TOKEN` and `WS_HUB_SMOKE_CLIENT_ID`.
- [ ] P1: Testcontainers jobs pass when `DOCKER_AVAILABLE=1`; docker-marked tests are skipped when unavailable.
- [ ] P1: OPA decision logs visible locally; CI asserts allow and deny through gateway with OPAL syncing from a Git repo.
- [ ] P0: CI compose validation workflow green on PRs touching web files.
- [ ] P0: JWT smoke CI configured with secrets and able to run minimal stack locally on CI.

## CI Guardrails (Added)

- __Workflow__: `.github/workflows/web-compose-validate.yml`
  - Runs `docker compose config` on `docker-compose.yml` and `compose.merged.yml`.
  - Greps for absolute Windows host paths and fails if found.
  - Asserts `auth-service` has a `healthcheck` in base compose.

- __Workflow__: `.github/workflows/web-jwt-smoke.yml`
  - Brings up a minimal dev stack (`postgres`, `redis`, `otel-collector`, `auth-service`, `ws-hub`, `gateway`).
  - Waits for container health and probes `/healthz`; posts to `/api/auth/authorize` stub.
  - Required to enable fully:
    - Secrets: `WS_HUB_SMOKE_TOKEN`
    - Vars (optional): `AUTH_REQUIRED`, `AUTHZ_REQUIRED`, `OPA_REQUIRED`, `WS_HUB_SMOKE_CLIENT_ID`

## Professional Prioritization and Next Steps

P0 – Must do next (unblock CI and raise signal):
- Stabilize Testcontainers CI: increase healthcheck attempts/timeouts (done), monitor flakes, and add retry/backoff if needed.
- Enable ws-hub WebSocket smoke in CI by setting:
  - Repository Secret: `WS_HUB_SMOKE_TOKEN`
  - Repository Variable: `WS_HUB_SMOKE_CLIENT_ID` (e.g., `smoke-client`)
- Keep docker-marked tests required for command/data-ingest/analytics/notification; fail-fast to surface regressions.

P1 – Broaden functional signals safely:
- Deeper smoke probes for analytics/notification (use safe, idempotent GETs only; currently asserting `/openapi.json`).
- Extend E2E happy path (gateway → device/command) with a second scenario and baseline timings.

P2 – Developer experience and coverage:
- Frontend skeleton wiring to gateway for manual exploratory tests.
- Add schema registry evaluation (Avro/Protobuf) and simple codegen demo where valuable.

## Milestones (Prioritized)

### M0.5 – Secure Foundations and Infra Enablement
- __[Infra: Compose Datastores]__ [90%]
  - Scope: Add PostgreSQL, Redis, (optional) Kafka to `docker-compose.yml`; healthchecks.
  - Dependencies: Docker Desktop. No app code changes required to start.
  - Acceptance: Containers start locally; sample `psql`/Redis CLI connection works.
- __[CI: Lint and Quality Gates]__ [90%]
  - Scope: Add Python lint (ruff) and TS lint/format (eslint/prettier). Document in `CONTRIBUTING.md`.
  - Dependencies: None.
  - Acceptance: Lint jobs pass; PRs fail on violations.
- __[Observability: Minimal Collector]__ [90%]
  - Scope: Provide a docker-compose profile (otel, prometheus, grafana, tempo/jaeger) for local.
  - Dependencies: Docker.
  - Acceptance: Hitting demo endpoints shows traces/metrics in Grafana.

### M1 – Data Ingest and API Gateway
- __[Data-Ingest Service (minimal)]__ [80%]
  - Scope: Create `services/data-ingest-service` (FastAPI). Endpoints: `/ingest/http` (POST); optional WS. Validate payloads (Pydantic v2). Forward to Kafka when available, else log.
  - Security: Optional `AUTH_REQUIRED`, `AUTHZ_REQUIRED`, `OPA_REQUIRED` using shared libs.
  - Dependencies: Shared security libs; optional Kafka.
  - Acceptance: Unit tests; optional integration test with Kafka (skippable via `DOCKER_AVAILABLE`).
- __[API Gateway]__ [90%]
  - Scope: Declarative config (Kong or Envoy) for routing to services. Enable rate-limit placeholder and JWT/OPA stubs for future.
  - Status: Secure gateway profile is up in a production-like mode (port 80, admin off). Gateway JWT smoke test validates route-level JWT against Keycloak dev. Remaining: finalize policy-aware plugins and optional OIDC plugin.
  - Dependencies: Existing services running locally.
  - Acceptance: Single entrypoint routes to device, command, analytics, notification, data-ingest.

### M2 – Testing Depth and Security Hardening
- __[Contract Tests (Schemathesis)]__ [90%]
  - Scope: Define OpenAPI per service; add Schemathesis contract tests in CI for all five services.
  - Dependencies: Deterministic service startup; compose profiles.
  - Acceptance: Contract test job green; failures block PR.
- __[Testcontainers for DB/Redis/Kafka]__ [80%]
  - Scope: Add integration tests for command-service (DB), data-ingest (Kafka), analytics (batch/stream stubs). Add liveness for ws-hub and device/auth services; optional ws-hub WebSocket connect smoke.
  - Dependencies: Docker; pytest markers to skip if unavailable.
  - Added: Manual workflow scaffold `.github/workflows/testcontainers.yml` (workflow_dispatch) to run docker-marked tests when present.
  - Acceptance: Tests pass locally and in CI where Docker is available; docker-marked tests required for command, data-ingest, analytics, and notification; ws-hub `/healthz` covered; optional ws connect smoke documented.
- __[E2E (Playwright) minimal]__ [70%]
  - Scope: One smoke scenario hitting gateway → device/command happy path; assert 200s and basic UI presence (if FE available) or API responses.
  - Dependencies: Gateway; services; optional frontend skeleton.
  - Acceptance: E2E job runs in CI; screenshots/traces stored as artifacts.
- __[Security: Real OIDC & OPA/OPAL Path]__ [90%]
  - Scope: Doc and scripts to bootstrap Keycloak (dev realm/clients) and OPA with example policy bundles (via OPAL).
  - Dependencies: Docker; existing `AUTH_GUIDE.md`.
  - Acceptance: Step-by-step works locally; tokens verified via JWKS; OPA decision logs visible; OPAL syncs from Git repo; policy CI green; OPAL sync assertion and E2E deny via gateway pass in CI.

## Workstreams and Details

### 1) Data/Infra
- __Compose Datastores__ [90%]
  - Points: Expose envs `POSTGRES_URL`, `REDIS_URL`, `KAFKA_BOOTSTRAP` with sensible defaults; add `profiles:` for optional services; healthcheck retries in waits.
- __Schema Registry (Future)__ [50%]
  - Points: Decide Avro vs Protobuf; add registry + example schema; codegen scripts.

### 2) Backend Services
- __data-ingest-service__ [80%]
  - Points: HTTP ingest first; WS optional; send to Kafka topic `data.raw` when enabled; include JSON schema validation example.
  - Testing: Unit tests; Kafka roundtrip test (skippable).
- __notification-service__ [60%]
  - Points: Implement throttling/rate-limit and simple email/webhook adapter abstraction; fake adapters for local.
  - Testing: Unit tests; adapter contract tests.
- __api-gateway__ [80%]
  - Points: Docker-compose sidecar; declarative routes; CORS; placeholder authn/z plugins; map `/api/*` to internal services.
  - Testing: Gateway JWT smoke via Keycloak dev; route-level JWT on temporary paths `/cmd`, `/dev`, `/an`, `/ing`, `/nt`.

### 3) Security
- __OIDC (real)__ [70%]
  - Points: Keycloak docker profile; document realm/client setup; configure JWKS URL; update `jwt_verifier.py` envs (issuer, audience) if needed.
  - Added: `jwks-service-smoke` CI validates service-level JWKS verification against Keycloak dev.
- __OPA/OPAL__ [90%]
  - Points: Provide minimal policy (`systemupdate.allow`) with action/resource/subject; decision logs; OPAL for bundles from GitHub.
  - Acceptance: Deny path returns 403; allow path returns 200; OPAL syncs bundles from `systemupdate-policies`; policy CI passes; OPAL sync assertion CI checks deterministic allow/deny.

### 4) Testing & Quality
- __Contract Tests__ [80%]
  - Points: Generate OpenAPI per service; stubs ok initially. Add GitHub Action job to run Schemathesis.
- __Testcontainers__ [60%]
  - Points: Guard with `DOCKER_AVAILABLE`; ensure Windows compatibility; cache images in CI for speed. Required docker-marked tests for command/data-ingest/analytics/notification; ws-hub and device/auth liveness covered; optional ws-hub WebSocket connect smoke behind `WS_HUB_SMOKE_TOKEN`.
- __E2E__ [70%]
  - Points: Minimal Playwright test; seed data script; CI artifact upload.
  - Added: OPA deny E2E through `gateway-secure` (port 8080) using minimal stack.
- __CI Lint & Security__ [95%]
  - Points: ruff, eslint/prettier; Trivy with controlled ignores; document risk acceptance; SBOM signing (Cosign) later.
  - Added: OPAL Sync Assertion CI and Gateway JWT Smoke CI with badges in `docs/TEST_GUIDE.md`.

### 5) Frontend
- __Skeleton__ [0%]
  - Points: React/TS + Vite + MUI; pages: Dashboard, Devices, Commands, Analytics; WS client placeholder.
  - Testing: Unit tests; basic route checks.

## Cross-Cutting Conventions
- Env toggles: `AUTH_REQUIRED`, `AUTHZ_REQUIRED`, `OPA_REQUIRED`, `DOCKER_AVAILABLE`.
- Shared libs under `libs/shared-python/security/` for auth, OPA, JWT.
- Logging: Structured JSON; include trace/span IDs.
- Docs: Update `AUTH_GUIDE.md`, `TEST_GUIDE.md`, `WINDOWS_SETUP.md` when adding features.

## Acceptance Checklist (Remaining)
- [ ] Compose adds Postgres/Redis (and Kafka optional) with health checks. [90%]
- [ ] Lint jobs (ruff, eslint/prettier) required in CI. [90%]
- [ ] data-ingest-service minimal HTTP path with tests. [80%]
- [ ] API Gateway routes to core services. [85%]
- [x] Contract tests run in CI for all core services (required). [Done]
- [x] Testcontainers tests for command-service and one more service. [Done]
- [x] Minimal E2E scenario via gateway. [Done]
 - [x] OPA deny via `gateway-secure` E2E.
 - [x] Gateway JWT smoke (route-level JWT on `/cmd`, `/dev`, `/an`, `/ing`, `/nt`).
- [ ] OIDC via JWKS validated against Keycloak dev profile. [40%]
  - [ ] Optional: migrate from OSS JWT plugin to OIDC plugin (Enterprise/Konnect) with discovery.
- [ ] OPA policy evaluated with visible decision logs. [80%]
- [x] Policies repo with policy/unit tests and CI (OPA + Conftest); OPAL GitHub sync configured. [Done]
- [x] Prod-like secure gateway runs on port 80 with admin disabled. [Done]
- [x] OPAL sync assertion CI checks deterministic allow/deny. [Done]
- [x] Gateway JWT smoke test validates route-level JWT against Keycloak dev on multiple routes. [Done]
 - [x] Testcontainers stability polish: increased healthcheck attempts/timeouts and fixed endpoints. [Done]
 - [ ] ws-hub WebSocket smoke enabled in CI (secrets/vars configured). [0%]

## Sequenced Execution Plan (Prioritized)
1. __Gateway polish (dev CORS, route normalization)__
   - File: `gateway/kong.yml` (CORS added). Ensure stable routes for FE/E2E. [Done]
   - Prod override using `gateway-secure` with port 80; admin not exposed. File: `docker-compose.prod.yml`. [Done]
   - Secure CORS profile with per-route plugins. File: `gateway/kong.prod.yml`. [Done]
2. __CI: Prod Security Smoke__ [Done]
   - Add job `prod-security-smoke` to bring up `gateway-secure` only (port 80, admin off) and probe routes/headers. Target: 100%.
   - Implemented as `.github/workflows/prod-security-smoke.yml` (uses CI override to publish proxy on 8080 for CI environment).
3. __Contract tests expand to more services__
   - Add Schemathesis runs for `notification-service` and `data-ingest-service` in `.github/workflows/contract-tests.yml`. Target: 90%. [Done]
4. __E2E expand to happy path__ [Done]
   - In `tests/e2e/tests/`, add a scenario: create command → verify via API. Target: 80%.
5. __Keycloak dev profile (JWKS)__
   - Add compose profile + scripts; document in `docs/AUTH_GUIDE.md`. Wire `issuer`/`audience`. Target: 70%.
   - Add Gateway JWT Smoke CI using Keycloak token against route-level JWT. [Done]
6. __OPA decision logs + OPAL bundles__
   - Enable OPA decision logs; wire OPAL to GitHub repo; add allow/deny tests and CI in `systemupdate-policies`. Target: 90%.
   - Add OPAL Sync Assertion CI with deterministic allow/deny checks. [Done]
7. __Testcontainers broaden__
  - Add integration tests for `data-ingest-service` (Kafka) and `analytics-service` stubs; guard with `DOCKER_AVAILABLE`. Target: 70%.
8. __Testcontainers stabilization & ws-hub WS smoke__
  - Increase healthcheck attempts/timeouts and fix liveness endpoints. Wire ws-hub WS smoke in CI using `WS_HUB_SMOKE_TOKEN` and `WS_HUB_SMOKE_CLIENT_ID`. Target: 100%.
9. __Infra polish__
  - Compose `profiles`, env defaults (`POSTGRES_URL`, `REDIS_URL`, `KAFKA_BOOTSTRAP`), healthcheck waits. Target: 100%.
10. __Frontend skeleton__
   - Vite + MUI scaffold wired to gateway; unit tests; minimal page smoke. Target: 60%.
11. __Docs/DevEx__
   - Update `docs/TEST_GUIDE.md` with Schemathesis/E2E usage and CI badges; ensure `docs/DEV_GATEWAY.md` quickstart is current. Target: 100%.
   - Add AUTH updates: Policy Dev Loop, Gateway JWT/OIDC guidance. [Done]

## Publishing and Wiring Policies Repo (How to Proceed)

1) __Create/publish repo__
- Repo: `https://github.com/nodweb/systemupdate-policies`.
- Seed contents from `systemupdate-web/systemupdate-policies/` (this repo includes a scaffold with `policies/`, `data/`, `tests/`, and CI).

2) __Enable policy CI__
- CI workflow file: `systemupdate-policies/.github/workflows/policy-ci.yml` runs on PR/push.
- Jobs: OPA fmt, OPA unit tests, Conftest verify.

3) __Wire OPAL to the repo__
- In `systemupdate-web/docker-compose.yml` (`opal-server`):
  - `OPAL_POLICY_REPO_URL=https://github.com/nodweb/systemupdate-policies.git`
  - `OPAL_POLICY_REPO_BRANCH=main`
  - `OPAL_POLICY_REPO_PATH=/`
  - `OPAL_POLICY_REPO_POLLING_INTERVAL=30`
- Start with: `docker compose --profile policy up -d opa opal-server opal-client`.

4) __Validate end-to-end__
- Confirm OPA decision logs show evaluations at `data.systemupdate.allow`.
- Run E2E deny test with OPA: set `OPA_E2E=1`, run `opa-deny.spec.ts`.
- In CI, ensure `e2e-opa-deny` and `prod-security-smoke` jobs pass.

5) __Tighten CORS for production__
- Update allowed origins in `gateway/kong.prod.yml` to your domain(s).
- Use prod override: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d gateway-secure`.
