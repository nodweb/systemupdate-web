# Authentication and Authorization Guide

This repo supports optional JWT authentication and authorization across services. Enforcement is controlled entirely by environment variables so you can enable security incrementally during local dev, CI, or prod.

## Environment Variables

- AUTH_REQUIRED
  - When "1" or "true" (case-insensitive), endpoints require a valid Bearer token.
  - Default: off.
- AUTHZ_REQUIRED
  - When "1" or "true", endpoints require an authorization decision for each request.
  - Default: off.
- AUTH_INTROSPECT_URL
  - HTTP URL for token introspection endpoint provided by auth-service (or external IdP bridge).
  - Example: http://localhost:8001/auth/introspect
- AUTH_AUTHORIZE_URL
  - HTTP URL for authorization endpoint provided by auth-service (or OPA/OPAL sidecar).
  - Example: http://localhost:8001/auth/authorize

- OPA_REQUIRED
  - When "1" or "true", services will also perform an OPA policy enforcement call in addition to auth-service authorization. Fail-closed on deny or error.
  - Default: off.
- OPA_URL
  - HTTP URL for OPA policy evaluation endpoint.
  - Example: http://localhost:8181/v1/data/systemupdate/allow
- OPA_TIMEOUT
  - Timeout in seconds for OPA calls (float).
  - Default: 2.5

## Policy Development Loop (OPA/OPAL)

- Edit policies in the separate repo: `systemupdate-policies` (main branch).
- OPAL server/client sync bundles from GitHub; ensure `policy` profile is active.
  ```bash
  docker compose --profile policy up -d opa opal-server opal-client
  curl -fsS http://localhost:8181/health
  ```
- Validate a decision locally (example deny for `commands:ack`):
  ```bash
  curl -s -X POST http://localhost:8181/v1/data/systemupdate/allow \
    -H 'content-type: application/json' \
    -d '{"input": {"action": "commands:ack"}}'
  ```
- Service integration: set `OPA_REQUIRED=1` and `OPA_URL=http://opa:8181/v1/data/systemupdate/allow` on services (e.g., `command-service`).
- CI:
  - OPA deny E2E: `.github/workflows/opa-deny-e2e.yml` (service-level enforcement)
  - OPA deny E2E (Gateway-Secure): `.github/workflows/opa-deny-e2e-secure.yml`
  - OPAL Sync Assertion: `.github/workflows/opal-sync-assert.yml`

## Notes:
- With enforcement off, services behave as before (backward-compatible).
- With enforcement on, failures are fail-closed with appropriate codes:
  - 401 Unauthorized for missing/invalid tokens.
  - 403 Forbidden for denied authorization decisions.

Developer bypass (local only): the shared JWT verifier supports the following for quick testing without a real IdP:
- AUTH_DEV_ALLOW_ANY = "1" | "true" → allows any request and injects a dev subject
- AUTH_DEV_SCOPE = "..." → optional scopes string used when bypass is active

## Service Behavior

All FastAPI services integrate the shared client at `libs/shared-python/security/authorize_client.py` which provides two async helpers:
- `introspect(token, url=AUTH_INTROSPECT_URL)` → `{ active: bool, ... }`
- `authorize(token, action, resource, url=AUTH_AUTHORIZE_URL)` → `{ allow: bool, ... }`

Per-endpoint actions/resources are defined in each service. Examples:
- command-service: `commands:create`, resource = `device_id`
- notification-service: per-alert authorize checks
- analytics-service: demo and batch/stream actions
- device-service: CRUD-style device actions

## Local Development

You can enable security per terminal session or in your shell profile.

Windows PowerShell (per session):
```powershell
Set-Item Env:AUTH_REQUIRED '1'
Set-Item Env:AUTHZ_REQUIRED '1'
Set-Item Env:AUTH_INTROSPECT_URL 'http://localhost:8001/auth/introspect'
Set-Item Env:AUTH_AUTHORIZE_URL  'http://localhost:8001/auth/authorize'
```

Disable again:
```powershell
Remove-Item Env:AUTH_REQUIRED -ErrorAction SilentlyContinue
Remove-Item Env:AUTHZ_REQUIRED -ErrorAction SilentlyContinue
```

### Keycloak dev profile (OIDC/JWKS)

For local OIDC with real JWTs, you can start a Keycloak dev realm via Compose and configure JWKS verification.

1) Start Keycloak (profile `auth`):

```powershell
docker compose --profile auth up -d keycloak
```

2) Realm import: `auth/keycloak/systemupdate-realm.json`

- Console: http://localhost:8080
- Admin login: admin / admin
- Realm name: `systemupdate-dev`

3) Configure services to use JWKS:

Export typical envs (PowerShell example):

```powershell
Set-Item Env:AUTH_REQUIRED '1'
Set-Item Env:AUTHZ_REQUIRED '1'
Set-Item Env:JWKS_URL       'http://localhost:8080/realms/systemupdate-dev/protocol/openid-connect/certs'
Set-Item Env:OIDC_ISSUER    'http://localhost:8080/realms/systemupdate-dev'
Set-Item Env:OIDC_AUDIENCE  'systemupdate-api'
```

Notes:
- The shared verifier in `libs/shared-python/security/jwt_verifier.py` reads `JWKS_URL`, `OIDC_ISSUER`, `OIDC_AUDIENCE` if present.
- If unset, services fall back to introspection (`AUTH_INTROSPECT_URL`).

### OPA profile (policy and decision logs)

Start OPA with decision logs enabled (profile `policy`):

```powershell
docker compose --profile policy up -d opa
Set-Item Env:OPA_REQUIRED  '1'
Set-Item Env:OPA_URL       'http://localhost:8181/v1/data/systemupdate/allow'
```

Policies live under `auth/opa/` (see `policy.rego`). Decisions are logged to OPA stdout.

### OPAL: syncing policies from a GitHub repository

Use OPAL to auto-sync Rego policies and data into OPA. This project includes optional OPAL containers under the `policy` compose profile.

Start OPA + OPAL:

```powershell
docker compose --profile policy up -d opa opal-server opal-client
```

Configure OPAL server to watch your policy repo via environment variables (defaults are set in `docker-compose.yml`):

- `OPAL_POLICY_REPO_URL` (e.g., `https://github.com/nodweb/systemupdate-policies.git`)
- `OPAL_POLICY_REPO_BRANCH` (e.g., `main`)
- `OPAL_POLICY_REPO_PATH` (e.g., `/`)
- `OPAL_POLICY_REPO_POLLING_INTERVAL` (seconds, e.g., `30`)

Example override when starting:

```powershell
OPAL_POLICY_REPO_URL=https://github.com/<org>/<repo>.git \
OPAL_POLICY_REPO_BRANCH=main \
OPAL_POLICY_REPO_PATH=/ \
OPAL_POLICY_REPO_POLLING_INTERVAL=15 \
docker compose --profile policy up -d opa opal-server opal-client
```

Recommended repo layout:

```
systemupdate-policies/
  policies/
    policy.rego           # package systemupdate
    commands.rego         # fine-grained rules
  data/
    roles.json            # role mappings
    tenants.json          # tenant configs
  README.md
```

Notes:
- Ensure your Rego packages and data paths align with what services query (e.g., `systemupdate/allow`).
- For private repos, configure OPAL server with access tokens (see OPAL docs). This demo config uses a public repo by default.

## Tests

- Unit tests run with security off by default unless a test sets the variables.
- For integration tests that contact `auth-service`, export the URLs.

Example (command-service):
```powershell
cd services/command-service
Set-Item Env:PYTHONPATH '.'
Set-Item Env:AUTH_REQUIRED '1'
Set-Item Env:AUTHZ_REQUIRED '1'
Set-Item Env:AUTH_INTROSPECT_URL 'http://localhost:8001/auth/introspect'
Set-Item Env:AUTH_AUTHORIZE_URL  'http://localhost:8001/auth/authorize'
pytest -q
```

## OIDC/JWT Verification

- Token validation and JWKS-based verification is available via shared libs (see `libs/shared-python/security/`).
- Introspection is used for simple on/off validation. You can switch to full local JWT verification as needed.

FastAPI dependency usage (already wired in services): when `AUTH_REQUIRED` is enabled, services apply the shared `require_auth()` dependency to protected routes, enforcing JWT verification before handlers run.

## Gateway JWT/OIDC at Kong

Global `jwt` plugin placeholders exist in `gateway/kong.yml` and `gateway/kong.prod.yml` (disabled). Enable only when IdP keys/JWKS are ready.

- OSS `jwt` plugin:
  - Create Consumers and add JWT credentials (HMAC/RSA). For Keycloak, export realm public key and register as `rsa_public_key` for the Consumer. JWKS rotation requires a sync process.
  - Minimal enable at global or route level:
    ```yaml
    plugins:
      - name: jwt
        enabled: true
        config:
          claims_to_verify: [exp]
          key_claim_name: kid
          run_on_preflight: false
    ```

- Enterprise/Konnect OIDC plugin (recommended):
  - Supports OIDC discovery and JWKS automatically.
  - Discovery URL (Keycloak dev): `http://keycloak:8080/realms/<realm>/.well-known/openid-configuration`

Keycloak dev profile (compose `auth`):
- Console: `http://localhost:8080`
- Admin: `admin / admin`
- Discovery: `http://localhost:8080/realms/<realm>/.well-known/openid-configuration`

Safe rollout checklist:
- [ ] Keep `KONG_ADMIN_LISTEN=off` for `gateway-secure` in prod-like runs
- [ ] Start on a single route; exclude health/docs
- [ ] Monitor 401/403 and logs; expand gradually

## Authorization (OPA/OPAL)

- Default policy is allow-all when `AUTHZ_REQUIRED` is off.
- When enabled, services call `AUTH_AUTHORIZE_URL` to obtain decisions.
- Optional: when `OPA_REQUIRED` is enabled, services also call the shared OPA client (`libs/shared-python/security/opa_client.py`) to enforce policies against `OPA_URL` (allow-all fallback when disabled).
- Future: Plug OPA sidecar or OPAL for dynamic policy distribution.

### Example: enable OPA locally (PowerShell)
```powershell
Set-Item Env:AUTHZ_REQUIRED '1'
Set-Item Env:OPA_REQUIRED  '1'
Set-Item Env:OPA_URL       'http://localhost:8181/v1/data/systemupdate/allow'
Set-Item Env:OPA_TIMEOUT   '2.5'
```

## OPA: Minimal Policy and Local Run

You can run a local OPA instance with a simple allow policy for development.

1) Create `policy.rego`:

```rego
package systemupdate

default allow = false

allow {
  # Example: allow read actions for any authenticated subject
  input.action == "read"
}

allow {
  # Example: allow admin scope for all actions
  some s
  s := input.subject.scope
  contains(s, "admin")
}
```

2) Run OPA locally and expose decision at `/v1/data/systemupdate/allow`:

```bash
docker run --rm -p 8181:8181 \
  -v ${PWD}/policy.rego:/policy.rego openpolicyagent/opa:0.64.1-rootless \
  run --server --addr :8181 /policy.rego
```

3) Test the decision API:

```bash
curl -s localhost:8181/v1/data/systemupdate/allow -d '{
  "input": {"action": "read", "resource": "demo", "subject": {"sub": "u1", "scope": "read"}}
}' | jq
```

Notes:
- Services construct `input` with `action`, `resource`, and `subject` (derived from JWT claims or auth response).
- In production, prefer an OPA sidecar and policy bundles (e.g., via OPAL) instead of bind-mounts.
