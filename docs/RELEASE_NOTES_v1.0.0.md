# SystemUpdate-Web v1.0.0 – Production Release Notes

Release date: 2025-08-28
Tag: v1.0.0
Branch: release/v1.0.0

## Highlights

- Backend services stabilized with tests and audit reports
- Frontend build fixed and optimized; Vite bundle produced
- Consolidated audit and checksum artifacts prepared under `release/v1.0.0/`

## Backend

- Flask app initialization hardened; SQLAlchemy session expiration configured for tests
- Device services expanded (queries, stats, status updates)
- Test suite: unit + integration passing
- Security reports included: bandit, pip-audit, radon (complexity/MI)

## Frontend

- Build via Vite successful; `dist/` packaged
- Reports available: ESLint, TypeScript, bundle size

## Ops/Packaging

- Release artifacts including tarballs and checksums prepared
- Final audit consolidation (`FINAL_AUDIT_REPORT.md`) available at repo root

## Security & Compliance

- Emphasis on consent, transparency, and minimal permissions in the Android app (see platform docs)
- Documentation updated for Windows setup, deployment, and troubleshooting

## How to Deploy

- See `docs/DEPLOYMENT.md` and `docs/en/DEPLOYMENT.md`
- Docker Compose available via `docker-compose.yml`

## Smoke Tests

- E2E tests for basic device flow included under `tests/e2e/`

## Known Limitations

- Further frontend bundle splitting can be explored in future versions
- Additional hardening and telemetry redaction will continue in subsequent releases

## Contributors

- SystemUpdate Engineering Team
