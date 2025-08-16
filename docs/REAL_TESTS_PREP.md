# Real Tests Preparation Guide (VPS)

This guide describes how to prepare a Linux VPS for running the real, production-like tests (contract, integration, and security) for SystemUpdate-Web. During active development the repo contains only minimal placeholder tests. Use this document to enable full tests when you're ready.

---

## 1) Target Environment
- Ubuntu 22.04/24.04 (or Debian 12)
- 2 vCPU, 4 GB RAM minimum (8 GB recommended)
- Public DNS record for your domain if testing TLS with Traefik

---

## 2) Install System Dependencies
```bash
# Update base
sudo apt-get update -y && sudo apt-get upgrade -y

# Core tools
sudo apt-get install -y git curl ca-certificates jq unzip build-essential python3.12 python3.12-venv python3-pip

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Node.js 20 LTS (for TypeScript codegen)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Optional: yq for YAML
sudo snap install yq
```

Verify:
```bash
docker --version
docker compose version
node -v
python3.12 --version
```

---

## 3) Clone Repo and Environment
```bash
mkdir -p ~/apps && cd ~/apps
git clone https://your.git.remote/SystemUpdate.git
cd SystemUpdate/systemupdate-web

# Copy env
cp .env.example .env
# Edit values
sed -i "s/DOMAIN=.*/DOMAIN=your.domain.tld/" .env
sed -i "s/LETSENCRYPT_EMAIL=.*/LETSENCRYPT_EMAIL=you@example.com/" .env
```

Required env keys in `.env` when running real tests:
- DOMAIN, LETSENCRYPT_EMAIL (for Traefik TLS) if exposing publicly
- OIDC_ISSUER, OIDC_AUDIENCE, OIDC_JWKS_URL (for real JWT validation tests)
- DATABASE_URL, REDIS_URL, KAFKA config if services require overrides

---

## 4) Start Stacks

### 4.1 Dev Stack (Local-style)
```bash
docker compose up -d
# check
docker compose ps
```

### 4.2 Prod-like Stack with Traefik (TLS)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
# check
docker compose ps
```

Validate routes (replace domain):
- https://your.domain.tld/api/auth/introspect
- https://your.domain.tld/api/devices
- wss://your.domain.tld/ws

Traefik dynamic config lives in `traefik/dynamic/`.

---

## 5) Code Generation (OpenAPI)

### 5.1 Python clients
```bash
python3.12 -m pip install -r libs/shared-python/requirements.txt
python3.12 libs/shared-python/codegen.py
```
Generated to `libs/shared-python/clients/`.

### 5.2 TypeScript types
```bash
cd libs/shared-ts
npm install --no-fund --no-audit
npm run generate
cd -
```
Generated to `libs/shared-ts/types/`.

---

## 6) Prepare Python Test Environments per Service
We run real tests from each service directory using a venv.

Common tips:
- Always set `PYTHONPATH='.'` so imports like `from app.main import app` work.
- Set `DOCKER_AVAILABLE=1` to enable Docker/Testcontainers-based tests.
- Install service-specific requirements (already declared in each service).

Example for each service:
```bash
# Auth Service
cd services/auth-service
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH='.'
# For real JWT tests, set OIDC_* envs (see Section 7)
pytest -q

# WS Hub
cd ../ws-hub
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH='.'
export DOCKER_AVAILABLE=1
pytest -q

# Device Service
cd ../device-service
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH='.'
export DOCKER_AVAILABLE=1
pytest -q
```

---

## 7) Real Security/JWT Test Setup
To run JWT validation tests against a real IdP (e.g., Keycloak):
- Provision an OIDC realm/client for the web stack.
- Gather:
  - OIDC_ISSUER: e.g., `https://keycloak.example/realms/yourrealm`
  - OIDC_AUDIENCE: client ID configured
  - OIDC_JWKS_URL: `https://keycloak.example/realms/yourrealm/protocol/openid-connect/certs`
- Set env before pytest:
```bash
export OIDC_ISSUER="https://.../realms/yourrealm"
export OIDC_AUDIENCE="systemupdate-web"
export OIDC_JWKS_URL="https://.../certs"
pytest -q services/auth-service
pytest -q services/ws-hub
```

If you use token introspection flow:
```bash
export AUTH_INTROSPECT_URL="https://auth.example/api/auth/introspect"
```

---

## 8) Contract Tests with Schemathesis
- Ensure services are running (dev or prod-like stack).
- Recommended: run from each service to target its `app` OpenAPI.

Example:
```bash
cd services/auth-service
source .venv/bin/activate
pip install schemathesis hypothesis
export PYTHONPATH='.'
# Against in-memory FastAPI app
python - <<'PY'
import schemathesis
from hypothesis import settings
from app.main import app
schema = schemathesis.openapi.from_asgi("/openapi.json", app=app)
@settings(deadline=None, max_examples=25)
@schema.parametrize()
def test_api(case):
    resp = case.call()
    case.validate_response(resp)
print("OK: schema loaded")
PY
pytest -q
```

Alternatively, against a running HTTP server:
```bash
schemathesis run http://localhost:8001/openapi.json --checks all
```

---

## 9) Integration Tests (Docker/Testcontainers)
- Enable by setting `DOCKER_AVAILABLE=1`.
- Ensure Docker Engine is running and the user is in the `docker` group.

```bash
export DOCKER_AVAILABLE=1
pytest -q services/device-service -k integration
```

---

## 10) Observability Checks
- Set OTLP exporter endpoint if you have a collector (e.g., `otel-collector`):
```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4317"
```
- Install observability deps if missing: `pip install opentelemetry-*`.

---

## 11) CI-Adjacent Quality Gates (Local)
- SBOM (Syft) and vulnerability scan (Trivy):
```bash
make sbom   # requires syft installed
make scan   # requires trivy installed
```
- Optional: CodeQL/secret scan/dependency review in GitHub Actions.

---

## 12) Troubleshooting
- Ports in use: `docker compose ps` and `docker compose logs -f`
- Certs not issued: ensure `DOMAIN` resolves publicly to VPS IP; HTTP->HTTPS reachable.
- Import errors in pytest: verify `export PYTHONPATH='.'` inside each service.
- NPM missing: `sudo apt-get install -y nodejs` and re-run codegen for TS.
- OpenAPI codegen issues: fix spec under `libs/proto-schemas/openapi/*.yaml` and rerun.

---

## 13) Checklist Before Running Real Tests
- [ ] Docker running; user in docker group
- [ ] `.env` configured (`DOMAIN`, `LETSENCRYPT_EMAIL`, OIDC if needed)
- [ ] Prod-like stack up (Traefik + services) or dev stack up
- [ ] Python venvs created and requirements installed per service
- [ ] `PYTHONPATH='.'` set when running pytest
- [ ] `DOCKER_AVAILABLE=1` exported for Testcontainers tests
- [ ] Node 20 installed; TS types generated (optional)
- [ ] OpenAPI Python clients generated (optional)

---

## 14) Windows Note
If you prepare locally on Windows before VPS:
- PowerShell does not support `&&` like bash; run commands separately.
- See `docs/WINDOWS_SETUP.md` and `docs/TEST_GUIDE.md` for Windows-specific steps.
