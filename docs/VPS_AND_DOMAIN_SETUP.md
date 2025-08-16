# VPS and Domain Setup (For Later Execution)

This guide consolidates all steps that require a real VPS and a domain. Keep it for when you're ready to run production-like tests. For local development, continue using minimal sample tests.

Related docs: see also `docs/REAL_TESTS_PREP.md` for detailed real-test preparation.

---

## 1) Prerequisites
- A Linux VPS (Ubuntu 22.04/24.04 or Debian 12), 2 vCPU/4GB RAM minimum (8GB recommended)
- A domain you control (e.g., example.com)
- Ability to create DNS A/AAAA records

---

## 2) DNS Records
Create records at your DNS provider pointing to your VPS public IP:
- `A` record: `api.example.com` -> `<YOUR_VPS_IPV4>`
- Optional IPv6: `AAAA` record -> `<YOUR_VPS_IPV6>`

If using wildcards:
- `A` record: `*.example.com` -> `<YOUR_VPS_IPV4>`

Propagation can take minutes to hours.

---

## 3) System Packages on VPS
```bash
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y git curl ca-certificates jq unzip build-essential python3.12 python3.12-venv python3-pip
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
# NodeJS for codegen if needed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 4) Clone Repository
```bash
# choose a work directory
mkdir -p ~/apps && cd ~/apps
# Replace with your repo URL
git clone <YOUR_REPO_URL>.git systemupdate-web
cd systemupdate-web
```

---

## 5) Environment Configuration
Create `.env` in repo root or a secure location, with values suitable for your domain/OIDC:
```env
# Traefik/Certificates
DOMAIN=api.example.com
LETSENCRYPT_EMAIL=you@example.com

# OIDC/Auth (example placeholders)
OIDC_ISSUER=https://accounts.google.com
OIDC_AUDIENCE=your-audience
JWKS_URL=https://www.googleapis.com/oauth2/v3/certs

# Optional toggles used in tests
DOCKER_AVAILABLE=true
```

Keep secrets in your CI/Secrets manager if automating deployments.

---

## 6) Bring Up the Stack (Prod-like with Traefik)
```bash
# Default compose (dev) may be enough:
docker compose up -d

# Or prod-like with Traefik reverse proxy and TLS:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check services
docker compose ps
```

Traefik will request/renew certificates via Let’s Encrypt if DNS points correctly to your VPS and ports 80/443 are open.

---

## 7) Validate Routing and TLS
- Open `https://api.example.com` in a browser; confirm valid TLS
- Check service routes (according to your service paths)
- For websockets (ws-hub), validate `wss://api.example.com` websocket endpoints

Traefik dashboard can be enabled behind auth if desired; not enabled by default here for security.

---

## 8) Real Tests (When Ready)
- Contract tests (Schemathesis) against the live endpoint (see `docs/REAL_TESTS_PREP.md`)
- Integration tests with Testcontainers (ensure Docker available on VPS)
- Security-related tests (JWT/OIDC flows) using real OIDC provider

Example Schemathesis (adjust paths/specs to your services):
```bash
# Example against device-service OpenAPI
st run http://api.example.com/openapi/device.yaml --checks all --hypothesis-max-examples 10 --base-url https://api.example.com
```

---

## 9) Logs and Troubleshooting
- `docker compose logs -f traefik`
- `docker compose logs -f <service-name>`
- Check DNS/Firewall:
  - Ports 80/443 open
  - DNS A/AAAA records correct
- Certificate issues:
  - Rate limits, wrong domain, clock skew

---

## 10) GitHub Environments/Secrets (Optional)
If you plan to deploy from CI later:
- Add repository secrets (e.g., `LE_EMAIL`, `OIDC_ISSUER`, `OIDC_AUDIENCE`, etc.)
- If using environments (e.g., `staging`, `prod`), map secrets per environment

---

## 11) Rollback/Cleanup
```bash
# Stop services
docker compose down
# Remove volumes if needed (DANGER: data loss)
# docker compose down -v
```

---

## 12) Checklist
- [ ] DNS A/AAAA records configured
- [ ] VPS firewall open on 80/443
- [ ] `.env` configured with domain/OIDC
- [ ] Stack up with Traefik and valid TLS
- [ ] Manual route checks OK
- [ ] Real tests (contract/integration) executed when ready
