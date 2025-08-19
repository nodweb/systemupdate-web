# Windows Dev Setup Guide (SystemUpdate-Web)

This guide explains how to set up a Windows 10/11 development environment using the automated script at `scripts/windows/setup-dev.ps1`.

## Prerequisites
- Windows 10/11 (Admin rights)
- Stable internet connection
- PowerShell (Run as Administrator)

## What the script does
- Enables Windows features: `VirtualMachinePlatform`, `Microsoft-Windows-Subsystem-Linux` (WSL)
- Sets WSL2 as default and optionally installs Ubuntu
- Installs Python 3.12, Git, and Docker Desktop via winget (if missing)
- Starts Docker Desktop and verifies engine availability
- Creates per-service Python virtual environments and installs dependencies
- Optionally runs pytest for each service

## Usage
Run PowerShell as Administrator.

- From anywhere (full path):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\UC\AndroidStudioProjects\SystemUpdate\systemupdate-web\scripts\windows\setup-dev.ps1"
```

- From the repo root `systemupdate-web/` (relative path):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/setup-dev.ps1
```

### Useful flags
- `-SkipUbuntuInstall` — Skips WSL distro installation (use after you finished Ubuntu first-run).
- `-NoTests` (alias of `-SkipTests`) — Do not run pytest after dependency install.
- `-Only "svc1,svc2"` — Only process selected services (names are folder names under `services/`):
  - `ws-hub`
  - `auth-service`
  - `device-service`
  - `command-service`
  - `analytics-service`
  - `notification-service`

Examples:
```powershell
# Install everything and run tests
powershell -NoProfile -ExecutionPolicy Bypass -File "...\scripts\windows\setup-dev.ps1"

# Skip tests
powershell -NoProfile -ExecutionPolicy Bypass -File "...\scripts\windows\setup-dev.ps1" -NoTests

# Only ws-hub and device-service, skip tests
powershell -NoProfile -ExecutionPolicy Bypass -File "...\scripts\windows\setup-dev.ps1" -Only "ws-hub,device-service" -NoTests

# After Ubuntu first-run, skip reinstalling it
powershell -NoProfile -ExecutionPolicy Bypass -File "...\scripts\windows\setup-dev.ps1" -SkipUbuntuInstall
```

## First run of Ubuntu (WSL)
After `wsl --install -d Ubuntu`, open the Ubuntu app from Start Menu once to complete user/password setup.
Then re-run the script with `-SkipUbuntuInstall`.

## Docker Desktop
- Script will try to start Docker Desktop and wait up to ~120s for the engine.
- If it doesn’t become ready, start Docker Desktop manually and re-run the script (you can use `-NoTests` to speed up).

## Troubleshooting
- "The argument 'scripts/windows/setup-dev.ps1' to the -File parameter does not exist": You ran from a different folder. Use the full path or run from the repo root.
- WSL install progress seems stuck: it can take several minutes. Ensure Windows Update and Microsoft Store are accessible. You can also install Ubuntu from the Microsoft Store, run it once, then re-run the script with `-SkipUbuntuInstall`.
- Need Admin: Some steps (enabling features) require Administrator PowerShell.

## What gets created
- Per-service venvs: `services/<service>/.venv/`
- Dependencies installed from `requirements.txt` in each service

## Next steps
- See `docs/TEST_GUIDE.md` for running tests, environment toggles (e.g., `DOCKER_AVAILABLE`), and common issues.
- See `docs/AUTH_GUIDE.md` for enabling JWT auth, authorization, and OPA policy checks.

### Security toggles (quick reference)
You can enable or disable authentication/authorization and OPA evaluation via environment variables before starting a service or running tests. See `docs/AUTH_GUIDE.md` for full details.

```powershell
# Enable JWT verification and auth-service authorization
$Env:AUTH_REQUIRED = '1'
$Env:AUTHZ_REQUIRED = '1'
$Env:AUTH_INTROSPECT_URL = 'http://localhost:8001/auth/introspect'
$Env:AUTH_AUTHORIZE_URL  = 'http://localhost:8001/auth/authorize'

# Optional: enable OPA enforcement (fail-closed on deny/error)
$Env:OPA_REQUIRED = '1'
$Env:OPA_URL = 'http://localhost:8181/v1/data/systemupdate/allow'
$Env:OPA_TIMEOUT = '2.0'

# Developer bypass for local-only scenarios (use cautiously)
$Env:AUTH_DEV_ALLOW_ANY = '1'   # accepts any bearer token and injects dev claims
$Env:AUTH_DEV_SCOPE = 'read write admin'
```

## Generate trace load (optional)
To visualize distributed tracing and the latency/error dashboards, you can generate sample traffic with the PowerShell script:

```powershell
# From repo root: systemupdate-web/
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/generate-trace-load.ps1 `
  -Target "http://localhost:8004/demo/downstream" `
  -Qps 10 `
  -DurationSeconds 60 `
  -Concurrency 4 `
  -DevicePrefix "dev-load" `
  -Profile steady `          # steady | burst | spike
  -ErrorRate 0.0 `           # 0..1 injects errors by hitting 404 path
  -VerboseLogs
```

Notes:
- Default target hits `command-service` which calls `device-service` and produces cross-service traces.
- Open Grafana at `http://localhost:3000` → Explore (Tempo) or dashboards under folder `SystemUpdate`.

Examples:
```powershell
# Burst profile with occasional errors
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/generate-trace-load.ps1 -Profile burst -ErrorRate 0.1 -Qps 20 -DurationSeconds 90

# Spike profile to stress latency SLO
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/generate-trace-load.ps1 -Profile spike -Qps 30 -DurationSeconds 60
```
