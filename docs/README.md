# SystemUpdate-Web Docs

## Legal Notice (Authorized Use Only)

This project is intended solely for authorized research, development, and testing in controlled environments with explicit consent from all parties involved. Do not deploy or operate these components to target devices you do not own or manage with documented authorization. Misuse may violate local and international laws. By using this repository, you agree to comply with all applicable laws, regulations, and organizational policies.

- You must obtain written permission for any testing involving third-party devices or networks.
- Logging, monitoring, and auditing must be enabled where required by policy.
- Data collection must respect privacy laws and retention policies.

For the corresponding Android client, the same legal and consent principles apply. Ensure your Android configuration reflects approved endpoints and certificate pinning policies.

## Quick Links

- Architecture: `docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`
- Dev Gateway: `docs/DEV_GATEWAY.md` (TLS & Pinning)
- Auth Guide: `docs/AUTH_GUIDE.md`
- Test Guide: `docs/TEST_GUIDE.md`
- Windows Setup: `docs/WINDOWS_SETUP.md`
- Roadmap: `docs/ROADMAP.md`
- Strategy: `docs/STRATEGY.md`
- [Execution Checklist](./EXECUTION_CHECKLIST.md) - Week-by-week implementation tracking

## Architecture

> **Note**: While some legacy references to Traefik may exist in the codebase, Kong is now the canonical API gateway. See [DEV_GATEWAY.md](./DEV_GATEWAY.md) for current gateway configuration.

## Scope

- Backend: FastAPI microservices (auth, device, command, data-ingest, analytics, ws-hub)
- Gateway: Kong (DB-less) as dev entrypoint
- Security: JWT/OIDC (Keycloak), OPA/OPAL (policy-as-code)
- CI: GitHub Actions (lint, tests, smokes)

Refer to `docs/TEST_GUIDE.md` for running pytest locally and CI expectations, and `docs/WINDOWS_SETUP.md` for Windows/WSL2 and Docker prerequisites.
