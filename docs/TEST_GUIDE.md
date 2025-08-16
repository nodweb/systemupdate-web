# Test Guide (SystemUpdate-Web)

This guide shows how to run tests for all Python services and how to use the Windows setup script.

For preparing and running full real tests (contract, integration, security) on a VPS, see:

- docs/REAL_TESTS_PREP.md

## Services
- `services/ws-hub`
- `services/auth-service`
- `services/device-service`

## Quick start with automation (Windows)
Use the setup script to create venvs, install dependencies, and optionally run tests.

```powershell
# From anywhere, full path
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\UC\AndroidStudioProjects\SystemUpdate\systemupdate-web\scripts\windows\setup-dev.ps1"

# From repo root (relative)
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/setup-dev.ps1
```

### Flags
- `-NoTests` (alias of `-SkipTests`): Do not run pytest after installing dependencies.
- `-Only "svc1,svc2"`: Only process selected services (`ws-hub`, `auth-service`, `device-service`).
- `-SkipUbuntuInstall`: Skip WSL distro installation if already completed.

Examples:
```powershell
# Only ws-hub and device-service, skip tests
powershell -NoProfile -ExecutionPolicy Bypass -File "...\scripts\windows\setup-dev.ps1" -Only "ws-hub,device-service" -NoTests
```

## Run tests manually (per service)
From service folder:
```powershell
# ws-hub
cd services/ws-hub
$env:PYTHONPATH='.'; .\.venv\Scripts\pytest -q

# auth-service
cd services/auth-service
$env:PYTHONPATH='.'; .\.venv\Scripts\pytest -q

# device-service
cd services/device-service
$env:PYTHONPATH='.'; .\.venv\Scripts\pytest -q
```

## Environment toggles

- `DOCKER_AVAILABLE`: Some integration tests use Testcontainers. If Docker is not available, set an env var or skip those tests as configured in each service’s tests. The default behavior in CI/dev assumes Docker is installed and running.

## Common issues

- "Module not found": Ensure you ran from the service folder and set `PYTHONPATH='.'` before pytest.
- Docker engine not ready: Start Docker Desktop and retry tests. On first startup, it may take 1–2 minutes.
- WSL install required: If the setup script prompts for WSL install, complete Ubuntu first-run from Start Menu, then re-run with `-SkipUbuntuInstall`.

## Notes

- The codebase uses contract tests (Schemathesis) and may pull OpenAPI/AsyncAPI specs from `libs/proto-schemas/`.
- ws-hub uses async websocket tests; ensure dependencies from `requirements.txt` are installed.

## Acceptance Checklist (Testing)

- [ ] Per-service minimal tests pass locally (`pytest -q`) with `PYTHONPATH='.'` from the service folder
- [ ] Aggregate tests pass from monorepo root using `pytest.ini`
- [ ] TypeScript OpenAPI types generated in `libs/shared-ts/types/`
- [ ] Python OpenAPI clients generated in `libs/shared-python/clients/`
- [ ] VPS test prep completed per `docs/REAL_TESTS_PREP.md` (Docker, Traefik, OIDC)
- [ ] Contract tests validated (Schemathesis against app or HTTP endpoint)
- [ ] Docker/Testcontainers-based integration tests pass on VPS
