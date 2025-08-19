# SystemUpdate-Web: Web Part Full Audit (2025-08-17)

Author: Senior Software Architect & Full-Stack Engineer
Scope: Monorepo at `SystemUpdate/systemupdate-web/` and related docs. Deep review of Docker Compose, Gateway, Observability, and docs. Files audited include: `docker-compose.yml`, `docker-compose.prod.yml`, `compose.merged.yml`, `gateway/kong.yml`, `gateway/kong.prod.yml`, `README.md`, and `docs/*`. Also cross-referenced: `SystemUpdate-Web/ARCHITECTURE_DOCUMENTATION_ANALYSIS.md` and `SYSTEMUPDATE_WEB_FULL_AUDIT_REPORT.md`.

---

## Executive Summary

- Overall maturity: Infra/gateway/observability scaffolds are strong. Service code directories exist but are empty in the workspace snapshot; compose wiring is present. Frontend skeleton not implemented yet.
- Key gaps: Authn/Z at gateway (JWT/OIDC) disabled; inconsistent docs (Traefik vs Kong); healthcheck/depends_on mismatch; Windows path issues in `compose.merged.yml`; CORS wide-open in dev; missing CI/runtime toggles wiring in services; no FE wiring.
- Priority fixes: fix healthchecks and depends_on, correct pathing; enable minimal JWT smoke on gateway; tighten dev/prod CORS; align README/docs; scaffold FE; add ws-hub CI smoke.

---

## Detailed Findings and Recommendations

### 1) Docker Compose and Runtime

- Finding: `docker-compose.yml` defines services with good healthchecks for most services, but `auth-service` has no `healthcheck`, while `gateway` and `gateway-secure` use `depends_on: condition: service_healthy` on `auth-service`.
  - Evidence: `docker-compose.yml` `auth-service` block lacks `healthcheck`. `gateway` depends_on `auth-service: condition: service_healthy`.
  - Risk: Gateway may never start in dev because dependency is never healthy.
  - Fix: Add `healthcheck` to `auth-service` consistent with other services (e.g., `curl -fsS http://localhost:8001/healthz`). Ensure service exposes `/healthz`.

- Finding: `compose.merged.yml` contains absolute Windows paths pointing to `C:\Users\UC\AndroidStudioProjects\SystemUpdate\...` while the actual workspace path is `C:\Users\UC\AndroidStudioProjectss\...` (note the extra "s").
  - Risk: Compose generated file will break on this machine; bind mounts may fail.
  - Fix: Regenerate `compose.merged.yml` from the correct root or avoid committing machine-specific absolute paths. Prefer relative contexts and bind mounts.

- Finding: `docker-compose.prod.yml` correctly disables admin for `gateway-secure` and publishes proxy on port 80. It also blanks service ports to force ingress via gateway.
  - Improvement: Consider adding profiles and comments for CI-only smoke to avoid accidental prod misconfig. Ensure `gateway-secure` can start independently by not depending on backends for smoke.

- Finding: Zookeeper/Kafka dependencies and healthchecks are well-considered; Schema Registry uses HTTP health.
  - Improvement: For Windows developers, document WSL2 Docker Desktop recommended settings; increase Kafka retries in heavy CI.

- Finding: Observability components (`otel-collector`, `prometheus`, `grafana`, `tempo`) wired with profiles, but `grafana` depends on `tempo` and `prometheus` `service_started`, not `healthy`.
  - Fix (optional): Add basic healthchecks for `prometheus`, `tempo`, `otel-collector` for deterministic dev UX.

### 2) API Gateway (Kong)

- Finding: `gateway/kong.yml` (dev) config has global `cors` with `origins: ["*"]`, `jwt` plugin present but disabled; routes map to service paths (`/auth`, `/devices`, `/commands`, `/ingest`, `/analytics`, `/notify`).
  - Risk: Wide-open CORS in dev can mask CORS issues; no authn/z at gateway.
  - Fix: Keep global CORS permissive in dev but add per-route CORS plugins in prod (already done). Enable a minimal JWT verification smoke on specific routes guarded by a shared key or Keycloak JWKS.

- Finding: `gateway/kong.prod.yml` limits CORS to `https://app.example.com`, includes disabled `jwt` plugin globally.
  - Fix: Replace OSS `jwt` plugin with OIDC or JWT with JWKS when Keycloak profile is available. Add route-level authn policies (e.g., `/commands`, `/devices`, `/ingest` require JWT). Document issuer/audience envs.

- Finding: Docs/README mention Traefik (`README.md` sections "Dev Gateway & Proxy" and "Gateway (Traefik) Notes"), but the active gateway is Kong with `gateway/kong*.yml` and compose services.
  - Risk: Developer confusion, misconfigured FE proxy.
  - Fix: Update `README.md` and docs to reflect Kong as the dev/prod gateway. Provide `vite.config.ts` proxy snippet and curl examples for Kong.

### 3) Services

- Finding: `services/` directories exist (`auth-service`, `device-service`, `command-service`, `data-ingest-service`, `analytics-service`, `notification-service`, `ws-hub`) but are empty in the current workspace snapshot.
  - Risk: Compose builds will fail due to missing Dockerfiles and app code; CI/test references may be placeholders.
  - Fix: Commit minimal FastAPI apps per service with `/healthz` and minimal endpoints as described in `README.md`.

- Finding: Environment variables for tracing are set (`OTEL_*`), but no confirmation that services initialize OTLP exporters.
  - Fix: Ensure each service conditionally enables OTel (env `OTEL_TRACES_ENABLE=1`) and exports to `OTLP` collector. Add simple instrumentation in service startup.

- Finding: `command-service` and `data-ingest-service` reference Kafka and topics. No schema registry client or aiokafka wiring confirmed in repo.
  - Fix: Add dependency gates (if aiokafka missing → no-op) and unit/integration tests with Testcontainers behind `DOCKER_AVAILABLE`.

### 4) Security

- Finding: No active JWT/OIDC validation at gateway; `jwt` plugin disabled.
  - Fix: Implement dev Keycloak profile (compose already present). Add per-route JWT via JWKS in `kong.yml` when `AUTH_REQUIRED=1`. Add toggle env in compose and templates.

- Finding: OPA/OPAL components available via profiles; no gateway authz integration demonstrated.
  - Fix: Add example external authz via plugin (OPA/Envoy ext_authz) or service-side OPA check middleware. Add decision logs and simple allow/deny demo.

- Finding: CORS permissive in dev, restricted in prod to placeholder domain.
  - Fix: Parameterize prod domain via env/templating and docs.

### 5) Observability

- Finding: OTel Collector present; Prometheus/Grafana/Tempo configured with provisioning folders.
  - Fix: Include example dashboards and scrape configs for services; document how to verify traces/metrics from services.

### 6) Documentation

- Finding: `README.md` references Traefik; actual gateway is Kong.
  - Fix: Replace Traefik notes or create a separate doc; add `gateway/` overview page and CI badge references from `docs/ROADMAP.md`.

- Finding: `docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md` and `docs/ROADMAP.md` are comprehensive; ensure reality check section tracks what is truly implemented locally (services currently missing).

### 7) CI/CD (from docs and structure)

- Finding: Badges for many workflows are listed; local repo may not include CI files.
  - Fix: Ensure `.github/workflows/*` are present; add smoke jobs for `gateway-secure` and ws-hub WS connect when secrets provided.

---

## Concrete Fix Plan (Prioritized)

P0 – Stability and Correctness
- Add `/healthz` and healthchecks for all services, especially `auth-service` to satisfy gateway `depends_on: service_healthy`.
- Correct `compose.merged.yml` absolute Windows paths or remove the file from source; rely on `docker-compose.yml` with relative contexts.
- Align docs: remove Traefik notes or mark deprecated; add Kong usage and curl examples.

P1 – Security Signals
- Add Keycloak dev profile quickstart and enable route-level JWT in `gateway/kong.yml` behind `AUTH_REQUIRED=1`.
- Add simple `jwks-service-smoke` (doc + CI) validating token verification via Keycloak dev realm.
- Add OPA decision logs and a deny test path; document OPAL Git sync.

P2 – Developer Experience and FE
- Scaffold `frontend/` (Vite + React + TS + MUI) with `/api` proxy to Kong and a basic dashboard hitting `/devices` and `/commands`.
- Add ws-hub WebSocket simple client page; document token binding approach.

P3 – Testing Depth
- Add Testcontainers-backed tests for `command-service` (Postgres) and `data-ingest-service` (Kafka) with `DOCKER_AVAILABLE` guard.
- Add minimal Playwright E2E hitting gateway routed paths (happy path + deny path with OPA).

---

## Quick Diffs/Configs to Apply (Examples)

- `docker-compose.yml` add healthcheck to `auth-service`:

```yaml
  auth-service:
    # ...
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://localhost:8001/healthz >/dev/null || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12
```

- `gateway/kong.yml` enable route-level JWT under env toggle (documented):

```yaml
plugins:
  - name: cors
    config: { origins: ["*"], methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS], headers: [Accept, Authorization, Content-Type] }
  - name: jwt
    enabled: ${AUTH_REQUIRED:-false}
    config:
      # configure consumers/keys in dev or switch to OIDC plugin with discovery in prod
      claims_to_verify: [exp]
      run_on_preflight: false
```

- README gateway section replacement (summary): Kong quickstart, curl via `http://localhost:8000/commands`.

---

## Acceptance Criteria for This Audit

- All services respond to `/healthz`; gateway starts reliably with `depends_on` health conditions met.
- Dev compose starts on a clean machine; no absolute path failures.
- README/docs match Kong-based setup; no Traefik confusion.
- Optional: Route-level JWT smoke available and documented; OPA deny example documented.
- FE skeleton available and can hit gateway routes via proxy.

---

## Appendix: File-by-File Notes

- `docker-compose.yml`: robust infra scaffolding, minor gaps (auth-service healthcheck). Good profiles for `secure`, `policy`, `auth`, `dev` on observability components.
- `docker-compose.prod.yml`: correct hardening for gateway; ensure ports cleared for backends in prod.
- `compose.merged.yml`: machine-specific; remove or regenerate; wrong path root in this workspace.
- `gateway/kong.yml`: dev config permissive CORS, jwt disabled; add toggles and per-route auth.
- `gateway/kong.prod.yml`: good per-route CORS; jwt disabled; plan to switch to OIDC.
- `README.md`: references Traefik; needs update to Kong docs; otherwise good overview of services and observability.
- `docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`: comprehensive target state.
- `docs/ROADMAP.md`: strong sequencing; incorporate this audit's P0–P2 items.
