# Strategic Recommendations (SystemUpdate-Web)

Updated: 2025-08-20

## Adopt Now (low risk, high leverage)

- Observability baseline
  - Enable OpenTelemetry export → Prometheus/Grafana/Tempo already available in compose profiles.
  - Add minimal dashboards and alert exemplars. Link from `docs/MONITORING.md`.
- SLOs baseline
  - Define p95 latency/error-rate targets for gateway and core services; document in `docs/TEST_GUIDE.md` and `docs/ALERTING.md`.
- API Docs Publishing
  - Publish OpenAPI artifacts per service in CI; link generated clients under `libs/shared-ts` and `libs/shared-python`.
- CI Guardrails
  - Keep `.github/workflows/web-compose-validate.yml` and `web-jwt-smoke.yml` green; expand with ws-hub smoke when secrets available.

## Defer to M2+ (scope-heavy)

- Service Mesh (Istio/Linkerd)
  - Adopt once inter-service contracts stabilize; consider mTLS via mesh.
- GraphQL Gateway
  - Revisit after REST routes mature; avoid mixing concerns early.
- Vault/Secrets Manager
  - Introduce when moving beyond dev/CI to stage/prod.
- Chaos Engineering & Synthetic Monitoring
  - Add after CI is stable and P0/P1 done; consider k6/Toxiproxy injections.
- Local K8s (Kind/Minikube)
  - Optional for contributors; Docker Compose remains baseline until CI fully green.

## Practical Enhancements

- Rate limiting via Kong + Redis
  - Prototype per-route limits on `/commands` and `/data-ingest/upload` after JWT is enforced.
- Dev Containers (onboarding)
  - Provide `.devcontainer/` for consistent envs across contributors.

## Timeline / Milestones Mapping

- M0.5 (now) — Secure foundations and infra enablement
  - Keep compose/datastores/observability green; docs up to date.
- M1 — Data Ingest and API Gateway
  - Finalize route-level JWT via JWKS; Android ↔ Web contracts complete.
- M2 — Testing Depth and Security Hardening
  - Contract tests across services; Testcontainers coverage; OPA/OPAL wired with CI assertions.
- M3+ — Advanced Platform
  - Consider mesh, GraphQL, Vault; add chaos/synthetic monitoring.

References:
- Roadmap: `docs/ROADMAP.md`
- Architecture: `docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`
- Dev Gateway: `docs/DEV_GATEWAY.md`
