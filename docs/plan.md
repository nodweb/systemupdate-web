# Plan

Act as a full-stack architect with expertise in microservices, event-driven architectures, and modern frontend frameworks. You design systems that scale to millions of users.

## Guiding Principles
- Security-first, toggled by envs: `AUTH_REQUIRED`, `AUTHZ_REQUIRED`, `OPA_REQUIRED`, `DOCKER_AVAILABLE`.
- Small, testable increments; green CI at each step.
- Deterministic local/CI environments (Docker, Compose profiles, healthchecks).

## Phases Overview
- Phase 1: Critical Infrastructure (P0 foundations, reliability gates)
- Phase 2: Security Layer (Keycloak/JWKS, OPA/OPAL, security E2E)
- Phase 3: Frontend & Integration (FE skeleton, WS, E2E)

## Recent Progress (2025-08-20)
- __Analytics-service middleware stabilized__: Ensured `X-Request-ID` header injection and standardized error JSON. Smoke tests green for health and 404 formatting.
- __Pytest gating for external deps__: Analytics Kafka consumer startup skipped when `PYTEST_CURRENT_TEST` is set to prevent CI flakes.
- __Safe import fallbacks__: Added dynamic imports for shared `app.handlers.exception_handler` and `app.middleware.*` to work outside package context during tests.
- __Docs alignment pending__: TEST_GUIDE and WINDOWS_SETUP to include pytest gating, optional deps, and import fallback notes.

## Immediate Next Actions
- __Phase 1 (P0)__
  - Replace FastAPI `@app.on_event` with lifespan handlers in services to resolve deprecation warnings.
  - Replace `datetime.utcnow()` with `datetime.now(datetime.UTC)` in `app/logging_config.py` and `libs/shared_python/health/__init__.py`.
  - Update `docs/TEST_GUIDE.md` with pytest gating (`PYTEST_CURRENT_TEST`) and service-local import fallbacks.
- __Phase 1/2 (Signals & Security)__
  - Add deeper GET-only smokes for analytics/notification beyond `/openapi.json`.
  - Proceed with ws-hub WS smoke enabling in CI after setting `WS_HUB_SMOKE_TOKEN` and `WS_HUB_SMOKE_CLIENT_ID`.
- __Phase 2 (Docs)__
  - Add notes on optional dependencies (python-jose, pythonjsonlogger, OpenTelemetry) and graceful fallbacks.

## Remaining Tasks (Summary, 2025-08-20)
  
- [ ] P0: Lifespan migration complete across services (`analytics`, `command`, `data-ingest`, `notification`, `device`, `ws-hub`).
- [ ] P0: Replace `datetime.utcnow()` with `datetime.now(datetime.UTC)` in `app/logging_config.py` and `libs/shared_python/health/__init__.py`.
- [ ] P0: Compose hygiene: remove absolute Windows paths; assert `healthcheck` for core services; keep `compose-validate` green.
- [ ] P0: Gateway JWT behind `AUTH_REQUIRED` validated (401 without JWT, 200 with Keycloak dev token); CI smoke stays green.
- [ ] P1: Deeper GET-only smokes for analytics/notification; assert standardized error JSON and headers.
- [ ] P1: Enable `ws-hub` WebSocket smoke in CI (requires `WS_HUB_SMOKE_TOKEN`, `WS_HUB_SMOKE_CLIENT_ID`).
- [ ] P1: Docs alignment: update `docs/TEST_GUIDE.md` (pytest gating `PYTEST_CURRENT_TEST`, fallback imports) and `docs/WINDOWS_SETUP.md` (Docker/WSL2 notes).
- [ ] P2: Keycloak JWKS integration end-to-end (conditional CI `jwks-service-smoke`).
- [ ] P2: OPA policies + OPAL sync with CI assertions (allow/deny with decision logs visible).
- [ ] P2: Frontend skeleton (Vite+React+TS+MUI) proxied to gateway with lint/format CI.

---
## Phase 1 — Critical Infrastructure

### 1) Complete Healthchecks (P0)
- Scope: Ensure `/healthz` for all core services; add Compose `healthcheck`.
- Acceptance:
  - All core services return 200 on `/healthz` ≤ 30s.
  - `gateway` is not blocked by missing healthchecks.
- CI Gates:
  - Extend `.github/workflows/web-compose-validate.yml` to assert `healthcheck` presence.
- Artifacts/Files:
  - `docker-compose.yml`, service Dockerfiles/apps, `docs/TEST_GUIDE.md`.

### 2) Remove Absolute Paths from Compose
- Scope: Eliminate host-specific paths (`C:\`, `D:\`, etc.).
- Acceptance:
  - `docker compose config` shows no absolute Windows paths.
- CI Gates:
  - Compose validate greps for `^[A-Za-z]:\\` and fails PRs.
- Artifacts/Files:
  - `docker-compose.yml`, remove/replace `compose.merged.yml`.

### 3) Enable Gateway JWT (behind AUTH_REQUIRED)
- Scope: Configure Kong route-level JWT; keep off by default; enable with `AUTH_REQUIRED=1`.
- Acceptance:
  - With `AUTH_REQUIRED=1`: 401 without JWT; 200 with valid Keycloak JWT.
- CI Gates:
  - Optional lightweight JWT smoke (runs only if secrets are present).
- Artifacts/Files:
  - `gateway/kong.yml`, `docs/AUTH_GUIDE.md`, `docs/TEST_GUIDE.md`.

### 4) CI Smoke Coverage (maintain GREEN)
- Scope: Keep isolated minimal JWT smoke green and reliable.
- Acceptance:
  - `web-jwt-smoke.yml` green with guard step and explicit compose flags.
- Diagnostics:
  - Logs saved as artifact and to repo workspace `jwt-smoke-last.log`.

---
## Phase 2 — Security Layer

### 1) Keycloak (JWKS) Integration
- Scope: Dev realm, client config, JWKS wiring; document setup.
- Acceptance:
  - Route-level JWT verified end-to-end with Keycloak dev.
- CI Gates (conditional):
  - `jwks-service-smoke` workflow (disabled unless secrets set).
- Artifacts/Files:
  - `gateway/kong.yml`, `docs/AUTH_GUIDE.md`.

### 2) OPA Policies + OPAL Sync
- Scope: Minimal policy (`systemupdate.allow`), decision logs, OPAL sync from `systemupdate-policies`.
- Acceptance:
  - Allow/Deny observable; logs emitted; sync confirmed.
- CI Gates:
  - OPAL Sync Assertion + allow/deny assertion job.
- Artifacts/Files:
  - Compose services: `opa`, `opal-server`, `opal-client`.
  - Repo: `https://github.com/nodweb/systemupdate-policies`.

### 3) Security E2E
- Scope: One deny and one allow scenario through `gateway-secure`.
- Acceptance:
  - CI job passes; artifacts contain logs.
- Artifacts/Files:
  - `tests/e2e/` and workflow updates.

---
## Phase 3 — Frontend & Integration

### 1) Frontend Skeleton (Vite + React + TS + MUI)
- Scope: Dashboard/Devices/Commands minimal pages; proxy to gateway.
- Acceptance:
  - Pages render; basic API call via proxy; lint/format CI passes.
- Artifacts/Files:
  - `frontend/` scaffold, Vite proxy config, CI lint job.

### 2) WebSocket (ws-hub)
- Scope: Basic connect, 101 upgrade, ping/pong; env-guarded in CI.
- Acceptance:
  - Local and CI smoke (if secrets present) succeed.
- CI Gates (conditional):
  - `ws-hub-smoke` workflow using `WS_HUB_SMOKE_TOKEN` and `WS_HUB_SMOKE_CLIENT_ID`.

### 3) Playwright E2E
- Scope: Minimal happy-path; artifact screenshots/traces.
- Acceptance:
  - CI job green; artifacts uploaded.

---
## Milestones & Sequencing
1. Compose validation hardening (healthchecks, absolute paths) — Phase 1
2. Gateway JWT behind flag + docs — Phase 1
3. Keycloak JWKS + jwks-service-smoke scaffold — Phase 2
4. OPA/OPAL sync + CI assertions — Phase 2
5. FE skeleton + lint CI — Phase 3
6. ws-hub smoke + Playwright E2E — Phase 3

---
## Risks & Mitigations
- Docker flakiness in CI → increase retries/timeouts; guard with `DOCKER_AVAILABLE`.
- Secrets not present → conditional CI jobs; stub fallbacks; document requirements.
- Cross-platform paths → forbid absolute mount paths via CI grep.

## Dependencies & Secrets
- Keycloak dev realm (issuer/audience), JWKS URL.
- Secrets: `WS_HUB_SMOKE_TOKEN`
- Vars: `WS_HUB_SMOKE_CLIENT_ID`

## CI Badges & Visibility (to add in docs/TEST_GUIDE.md)
- JWT smoke (isolated) — GREEN
- Compose validate — required on PRs
- Optional: jwks-service-smoke, ws-hub-smoke, security E2E

## Runbooks
- Local dev bootstrap on Windows: see `docs/WINDOWS_SETUP.md`.
- Testing guide and CI badges: `docs/TEST_GUIDE.md`.
- Troubleshooting CI: check job logs and `jwt-smoke-last.log` in repo workspace.

---
## Rollback Strategy (All Phases)

### Objectives
- Minimize MTTR by providing deterministic rollback paths per phase and component.

### Global Controls
- Pre-deployment snapshots: database (logical dumps or volume snapshots), configs, container image tags.
- Feature flags: `AUTH_REQUIRED`, `AUTHZ_REQUIRED`, `OPA_REQUIRED`, and service-specific toggles to disable risky paths.
- Service mesh / gateway backups: export Kong/mesh configuration before change.

### Phase-specific Rollback
- Phase 1
  - Revert compose changes (use previous tagged commit).
  - Temporarily disable healthchecks causing startup churn.
  - Document known issues in `docs/INCIDENTS.md`.
- Phase 2
  - Disable `AUTH_REQUIRED` to bypass JWT at gateway if needed.
  - Fallback to basic auth (dev-only) for emergency access.
  - Preserve audit logs of security decisions and gateway.
- Phase 3
  - Disable FE features via feature flags; pin to last known-good FE build.
  - Roll back ws-hub by disabling WS connect in CI and FE.

### DB Migrations
- Use idempotent, reversible migrations (e.g., Alembic). Require `down_revision` for every `upgrade`.
- Blue/green schema pattern: add new columns nullable; dual-write behind flags; cutover; remove old paths later.
- Post-rollback validation: schema version check, critical queries sanity, `/healthz` and minimal business SLOs.

### Validation After Rollback
- CI rerun of smoke tests; compose validate; gateway route probes.
- Manual checklist for affected services; error rate and latency back to baseline.

---
## Performance Testing Strategy

### Targets (initial)
```yaml
performance_targets:
  healthcheck_response: "< 100ms"
  jwt_validation: "< 50ms"
  api_gateway_latency: "< 10ms overhead"
  e2e_test_duration: "< 5 minutes"
```

### Scenarios
- Concurrency tiers: 1K, 10K, 100K simulated users (graduated across phases; Phase 1 focuses on 1K).
- Workload mix: read-heavy for gateway APIs; small payload writes for ingest; WS ping/pong for ws-hub.

### SLAs/SLOs
- Define service-level SLAs (p95 latency, error rate < 0.1%).
- Establish resource baselines (CPU, memory, I/O) at target QPS.

### CI Integration
- Lightweight perf smoke in CI (threshold guards) to detect regressions.
- Nightly heavier load runs (self-hosted runner or external load gen) with trend reporting.

### Bottleneck Methodology
- Use tracing/metrics to locate hotspots (DB, network, CPU-bound code); apply A/B tuning with controlled experiments.

---
## Monitoring & Alerting

### Phase 1 Deliverables
- Prometheus metrics for service health and basic app KPIs.
- Grafana dashboards for gateway latency, auth decisions, DB/Redis health.
- Alert rules: container crashloop, healthcheck failure, gateway 5xx surge.

### Implementation Notes
- Add compose profile for observability (otel/Prometheus/Grafana) for local.
- In CI, export metrics as artifacts; dashboards as JSON in `docs/observability/`.

---
## Data Migration Strategy (Phase 2)
- Schema versioning via migrations; backward-compatible changes first.
- Pre-checks: data shape validation; post-checks: query correctness and perf budgets.
- Rollback procedures defined per migration; snapshot/restore steps documented.

---
## Documentation Automation
- OpenAPI spec auto-generation per service; publish as CI artifact.
- Postman collection export from OpenAPI; attach to releases.
- Architecture diagrams (diagrams-as-code) updated on merge; commit generated images to `docs/`.

---
## Disaster Recovery (DR)

### Objectives
- Define RTO/RPO per service; ensure backup/restore paths are tested.

### Plan
- Backups: scheduled DB backups; config and artifact retention policies.
- Restore: runbook with verification steps; checksum and sample query validations.
- Multi-region failover (design): DNS failover, stateless services redeploy; stateful via managed replicas.
- Consistency verification: compare record counts/hashes; error budget monitoring after failover.
- Incident communications: on-call escalation, status page updates, and postmortem template.

### Phasing
- Phase 1: establish backups + restore dry run for core DB; basic dashboards and alerts.
- Phase 2: RTO/RPO targets formalized; periodic restore tests; partial failover exercise.
- Phase 3: document full multi-region strategy; drill runbooks.

---
## Lifespan Migration Plan (Deprecation Cleanup)

- __Objective__: حذف اخطارهای `@app.on_event` و استاندارد کردن startup/shutdown.
- __Approach__:
  - Introduce `lifespan(app)` context manager per service and move startup/shutdown logic (Kafka, DB, schedulers) داخل آن.
  - Preserve pytest gating (`PYTEST_CURRENT_TEST`) inside lifespan to skip external deps during tests.
  - Add unit tests for lifespan enter/exit no-op paths under pytest.
- __Targets__:
  - `services/analytics-service/app/main.py` → migrate startup/shutdown consumers.
  - `services/command-service/app/main.py`, `services/data-ingest-service/app/main.py`, `services/notification-service/app/main.py`, `services/device-service/app/main.py`, `services/ws-hub/app/main.py` → align patterns.
- __Acceptance__:
  - No deprecation warnings on import/app startup.
  - All smoke tests remain green; external deps still gated in pytest.

## Deprecation Remediation (UTC-aware time)

- __Objective__: جایگزینی `datetime.utcnow()` با `datetime.now(datetime.UTC)`.
- __Files__:
  - `systemupdate-web/app/logging_config.py`
  - `systemupdate-web/libs/shared_python/health/__init__.py`
- __Acceptance__: عدم وجود DeprecationWarnings در اجرای تست‌ها و اسموک‌ها.

## Service-by-Service Status Matrix (Middleware, Gating)

- __analytics-service__
  - Middleware: `RequestContextMiddleware`, `RequestLoggingMiddleware` ثبت شده (header `X-Request-ID` OK).
  - Exception handlers: ثبت شده (ساختار خطا استاندارد).
  - Pytest gating: Kafka consumer skipped.
- __data-ingest-service__
  - Middleware/handlers: safe fallback imports اعمال شده؛ Kafka producer gating در pytest.
  - Follow-up: تایید درج هدر و فرمت خطا با اسموک مشابه analytics.
- __command-service__
  - Gating: publisher background skip under pytest.
  - Follow-up: مرور middleware fallback و اسموک هدر/خطا.
- __notification-service__
  - Fallback imports افزوده شده؛ `app/__init__.py` موجود.
  - Follow-up: اسموک هدر/خطا.
- __device-service__, __auth-service__, __ws-hub__
  - Follow-up: افزودن fallback imports + اسموک‌های هدر/خطا + lifespan migration.

## CI Enhancements (Next)

- __Testcontainers stability__: افزایش backoff/retry در setup/teardown؛ healthcheck timeouts بالا.
- __ws-hub smoke__: فعال‌سازی job شرطی با `WS_HUB_SMOKE_TOKEN` و `WS_HUB_SMOKE_CLIENT_ID`؛ انتظار 101 upgrade + ping/pong.
- __Schemathesis/E2E visibility__: نشر artifacts ثابت (OpenAPI، اسکرین‌شات/trace) و لینک در `docs/TEST_GUIDE.md`.

## Documentation Updates

- `docs/TEST_GUIDE.md`: توضیح `PYTEST_CURRENT_TEST` gating، الگوی fallback import، و وابستگی‌های اختیاری.
- `docs/WINDOWS_SETUP.md`: نکات Docker/WSL2 برای Testcontainers، cache تصاویر برای سرعت.
- `docs/DEV_GATEWAY.md` (در صورت وجود): به‌روزرسانی مثال‌های curl و Vite proxy.

## Backlog: Next 2 Sprints (High → Medium)

- __Sprint N (High)__
  - Lifespan migration across analytics/data-ingest/command/notification/device/ws-hub.
  - UTC-time remediation in logging_config/health lib.
  - Add/green smoke tests for middleware headers + standardized error JSON across all services.
  - CI: enable ws-hub smoke (conditional), add retries/backoff to Testcontainers setup.
  - Docs: TEST_GUIDE + WINDOWS_SETUP updates reflecting gating/fallbacks.

- __Sprint N+1 (High/Medium)__
  - Deeper GET-only smokes for analytics/notification.
  - E2E: سناریوی دوم (gateway → device/command) با baseline timings.
  - Security: پیشروی Keycloak JWKS validation; OPA decision logs visibility polish.
  - Infra polish: compose profiles/env defaults، healthcheck waits.
  - Frontend skeleton bootstrap (Vite+React+TS+MUI) و اتصال به gateway برای exploratory.

## Definition of Done (Middleware & Errors)

- __Headers__: هر پاسخ شامل `X-Request-ID` و `X-Process-Time` باشد.
- __Errors__: ساختار استاندارد `{ error: { code, message, details? } }` در تمام سرویس‌ها.
- __Tests__: smoke برای `/healthz` و 404 مسیر ناموجود با assertions هدر/فرمت.
- __Gating__: عدم راه‌اندازی اتصالات خارجی طی pytest.
- __Docs__: به‌روزرسانی TEST_GUIDE/WINDOWS_SETUP برای الگوها و وابستگی‌های اختیاری.
