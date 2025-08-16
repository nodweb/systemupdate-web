# SystemUpdate-Web Monorepo

[![Python CI](https://github.com/nodweb/systemupdate-web/actions/workflows/python-ci.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/python-ci.yml)
[![SBOM & Security](https://github.com/nodweb/systemupdate-web/actions/workflows/sbom-security.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/sbom-security.yml)
[![Python Codegen](https://github.com/nodweb/systemupdate-web/actions/workflows/codegen-python.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/codegen-python.yml)
[![Markdown Lint](https://github.com/nodweb/systemupdate-web/actions/workflows/markdownlint.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/markdownlint.yml)

Enterprise-grade web stack for remote Android device management.

- Architecture: see `docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`
- Phases: 2 (Backend), 3 (Frontend), 4 (Infra)

## Getting Started (M0)

- Local dev via Docker Compose (to be added in M0)
- CI: GitHub Actions (lint/test/build) (placeholder)

## Quick Local Testing

- Aggregate tests from repo root (using auth-service venv Python):

```powershell
services\auth-service\.venv\Scripts\python -m pytest -q
```

- Per-service quick run:

```powershell
# Auth Service
$env:PYTHONPATH='.'; pushd services/auth-service; .\.venv\Scripts\pytest -q; popd

# Device Service
$env:PYTHONPATH='.'; pushd services/device-service; .\.venv\Scripts\pytest -q; popd

# WS Hub
$env:PYTHONPATH='.'; pushd services/ws-hub; .\.venv\Scripts\pytest -q; popd
```

More details: `docs/TEST_GUIDE.md`.

## Milestones

- M0: Scaffold + CI + local dev
- M1: Auth + API Gateway + Device + WS Hub v1
- M2: Command + Android integration + Outbox
- M3: Data Ingest + Analytics minimal
- M4: Notifications + OPA + Audit
- M5: Scale-out + Canary + Load/Chaos
