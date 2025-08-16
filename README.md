# SystemUpdate-Web Monorepo

[![Python CI](https://github.com/nodweb/systemupdate-web/actions/workflows/python-ci.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/python-ci.yml)
[![SBOM & Security](https://github.com/nodweb/systemupdate-web/actions/workflows/sbom-security.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/sbom-security.yml)
[![Python Codegen](https://github.com/nodweb/systemupdate-web/actions/workflows/codegen-python.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/codegen-python.yml)
[![Markdown Lint](https://github.com/nodweb/systemupdate-web/actions/workflows/markdownlint.yml/badge.svg)](https://github.com/nodweb/systemupdate-web/actions/workflows/markdownlint.yml)

Enterprise-grade web stack for remote Android device management.

- Architecture: see `../docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`
- Phases: 2 (Backend), 3 (Frontend), 4 (Infra)

## Getting Started (M0)

- Local dev via Docker Compose (to be added in M0)
- CI: GitHub Actions (lint/test/build) (placeholder)

## Milestones

- M0: Scaffold + CI + local dev
- M1: Auth + API Gateway + Device + WS Hub v1
- M2: Command + Android integration + Outbox
- M3: Data Ingest + Analytics minimal
- M4: Notifications + OPA + Audit
- M5: Scale-out + Canary + Load/Chaos
