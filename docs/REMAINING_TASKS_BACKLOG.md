# SystemUpdate-Web Remaining Tasks Backlog (Prioritized)

Scope: Web monorepo at `SystemUpdate/systemupdate-web/` (backend services, gateway, observability, docs) and FE skeleton.
Prioritization: P0 (critical), P1 (high), P2 (medium), P3 (nice-to-have). Each item includes definition of done (DoD).

---

## P0 — Stability, Boot, Correctness

1. Auth service healthcheck parity
   - Action: Implement `/healthz` in `services/auth-service` and add `healthcheck` in `docker-compose.yml`. Ensure `gateway` `depends_on: service_healthy` works.
   - DoD: `docker compose up` brings `gateway` healthy without manual restarts; `curl http://localhost:8001/healthz` returns 200.

2. Remove machine-specific paths in `compose.merged.yml`
   - Action: Regenerate or remove; ensure no absolute Windows paths are committed. Use relative contexts.
   - DoD: Fresh clone on this machine starts with `docker compose up` without path failures.

3. Align docs from Traefik to Kong
   - Action: Update `systemupdate-web/README.md` to reference Kong only. Add quickstart, curl, and proxy examples.
   - DoD: README gateway section shows Kong; no Traefik remnants.

4. Service scaffolds present in repo
   - Action: Commit minimal FastAPI apps for all services with `/healthz`. Add Dockerfiles.
   - DoD: `docker compose build` succeeds; each service responds to `/healthz`.

---

## P1 — Security Enablement (dev-friendly)

5. Dev Keycloak quickstart and JWT smoke via Kong
   - Action: Document Keycloak profile usage; enable `jwt`/OIDC on selected routes under toggle `AUTH_REQUIRED=1` in `gateway/kong.yml`.
   - DoD: With profile on, `curl` without JWT gets 401; with a valid token gets 200 on `/devices`.

6. OPA/OPAL demo policy and deny path
   - Action: Add minimal Rego policy, OPAL sync, and an endpoint requiring allow. Add deny test.
   - DoD: CI smoke executes allow/deny checks and records decision logs.

7. CORS tightening for prod config
   - Action: Parameterize prod origin; ensure `gateway/kong.prod.yml` reads from env.
   - DoD: Setting `APP_ORIGIN` changes allowed origin in running gateway.

---

## P2 — Developer Experience & Frontend Wiring

8. Frontend skeleton (Vite + React + TS + MUI)
   - Action: Create `frontend/` app, RTK Query base, proxy `/api` to Kong, basic pages: Dashboard, Devices, Commands.
   - DoD: `npm run dev` serves FE; clicking Devices fetches via gateway.

9. WebSocket hub smoke
   - Action: FE client connects to `ws-hub` via gateway with retry/backoff; basic message echo.
   - DoD: CI E2E validates WS connect and one message roundtrip.

10. Observability quick-verification
   - Action: Add example traces/metrics emission from services; docs with Grafana/Tempo screenshots.
   - DoD: Opening Grafana shows service dashboard; Tempo query returns traces.

---

## P3 — Testing Depth & CI

11. Testcontainers for DB/Kafka
   - Action: `command-service` Postgres tests; `data-ingest-service` Kafka tests; gated by `DOCKER_AVAILABLE`.
   - DoD: CI job green on Linux runners; skipped on unsupported.

12. Contract tests (Schemathesis) via OpenAPI
   - Action: Expose OpenAPI from services and run Schemathesis smoke.
   - DoD: Schemathesis job runs against gateway routes and passes.

13. Playwright E2E minimal suite
   - Action: Auth flow, protected route, WS message.
   - DoD: Job green; artifacts include screenshots/videos on failure.

---

## Cross-cutting Conventions & Ownership

- Coding standards: FastAPI + Pydantic v2, Ruff/Black; TypeScript strict; commit hooks.
- Security: Secrets via env files; never commit real creds. Keycloak/OPA profiles optional.
- Ownership: Backend platform (infra/gateway) — Platform team; Services — respective service owners; FE — Web team.
- Tracking: Link each task to ROADMAP workstreams and percentages; update `docs/ROADMAP.md` as items complete.
