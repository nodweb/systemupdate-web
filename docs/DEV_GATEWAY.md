# Dev API Gateway (Kong DB-less)

This repo uses Kong (DB-less) as the development API gateway to provide a single entrypoint to backend services and to simplify CORS handling.

## How it runs

- Defined in `docker-compose.yml` service `gateway` (ports: proxy 8000, admin 8001)
- Declarative config: `gateway/kong.yml`
- Global CORS enabled for development

Start stack:

```bash
docker compose up -d
# gateway proxy: http://localhost:8000
# gateway admin: http://localhost:8001
```

## Routes (prefix → upstream)

- `/devices` → `device-service:8003`
- `/commands` → `command-service:8004`
- `/ingest` → `data-ingest-service:8005`
- `/analytics` → `analytics-service:8006`
- `/notify` → `notification-service:8007`
- `/auth` → `auth-service:8001`

Examples:

```bash
curl -s http://localhost:8000/devices/healthz
curl -s http://localhost:8000/commands/healthz
curl -s -X POST http://localhost:8000/ingest -H 'content-type: application/json' -d '{"device_id":"d1","kind":"temp","data":{"c":21.5}}'
```

## CORS

- `gateway/kong.yml` enables a dev-friendly global CORS plugin allowing all origins and common methods/headers.
- For production, tighten origins and consider per-route plugins instead of global.

### Production CORS example (Kong)

Prefer per-route/plugin configuration with explicit origins and no wildcard:

```yaml
plugins:
  - name: cors
    tags: [prod]
    config:
      origins:
        - "https://app.example.com"
      methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
      headers: [Accept, Authorization, Content-Type]
      exposed_headers: [Link]
      credentials: true
      max_age: 600
    enabled: true
```

Attach on specific services/routes in `gateway/kong.yml` instead of globally.

## Optional profiles: AuthZ/Policy

- Keycloak (dev OIDC) profile:
  - Compose profile: `auth`
  - Command: `docker compose --profile auth up -d keycloak`
  - Realm import mounted from `auth/keycloak/systemupdate-realm.json`
  - Console: http://localhost:8080 (admin/admin)

- OPA (policy) profile:
  - Compose profile: `policy`
  - Command: `docker compose --profile policy up -d opa`
  - Decision API: `http://localhost:8181/v1/data/systemupdate/allow`
  - Policy dir: `auth/opa/` (logs enabled to console)

### Profiles: dev vs secure gateway

- Dev (permissive CORS, global plugin):

```powershell
docker compose --profile dev up -d gateway
# Proxy: http://localhost:8000, Admin: http://localhost:8001
```

- Secure (tight CORS, per-route plugins):

```powershell
docker compose --profile secure up -d gateway-secure
# Uses gateway/kong.prod.yml with explicit origins and credentials=true
```

### Production override (secure by default)

Use the prod override to publish only the proxy on port 80 with the secure gateway and avoid exposing the Kong admin API:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d gateway-secure
# Proxy: http://localhost (port 80). Admin (8001) is NOT exposed in this override.
```

### OPAL policy bundles (optional)

You can run OPAL server/client to demo policy bundle sync into OPA:

```powershell
docker compose --profile policy up -d opa opal-server opal-client
# OPA API:    http://localhost:8181
# OPAL server: http://localhost:7002
```

Notes:
- This demo wiring does not publish a real bundle by default; policies still come from `auth/opa/`.
- For production, wire OPAL to a Git repo or file publisher that emits bundles consumed by `opal-client` and stored in OPA.

## JWT on a route (dev) with Keycloak

This mirrors the CI smoke test and lets you reproduce locally.

1) Start services and Keycloak:

```bash
docker compose --profile auth up -d keycloak postgres redis command-service device-service gateway
```

2) Wait for Keycloak OIDC discovery to be ready, then capture issuer and JWKS:

```bash
disco=$(curl -s http://localhost:8080/realms/systemupdate-dev/.well-known/openid-configuration)
ISS=$(echo "$disco" | jq -r '.issuer')
jwks_uri=$(echo "$disco" | jq -r '.jwks_uri')
jwks=$(curl -s "$jwks_uri")
x5c=$(echo "$jwks" | jq -r '.keys[0].x5c[0]')
printf "-----BEGIN CERTIFICATE-----\n%s\n-----END CERTIFICATE-----\n" "$x5c" > pubkey.pem
```

3) Create a consumer + JWT credential whose key = issuer (iss), and protect a temporary route `/cmd` targeting `command-service`:

```bash
# Note: admin API must be reachable (dev profile publishes 8001)
curl -s -X POST http://localhost:8001/consumers -d 'username=dev-user' >/dev/null
curl -s -X POST http://localhost:8001/consumers/dev-user/jwt \
  -F key=$ISS -F algorithm=RS256 -F rsa_public_key=@pubkey.pem >/dev/null

curl -s -X POST http://localhost:8001/services/command-service/routes \
  -d name=cmd-route -d 'paths[]=/cmd' -d strip_path=true >/dev/null
curl -s -X POST http://localhost:8001/routes/cmd-route/plugins \
  -d name=jwt -d config.claims_to_verify=exp -d config.key_claim_name=iss -d config.run_on_preflight=false >/dev/null
```

4) Obtain a user token and call via gateway:

```bash
TOKEN=$(curl -s -X POST \
  -d 'client_id=frontend' -d 'grant_type=password' \
  -d 'username=devuser' -d 'password=devpass' \
  http://localhost:8080/realms/systemupdate-dev/protocol/openid-connect/token | jq -r '.access_token')

curl -i http://localhost:8000/cmd/openapi.json            # 401
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8000/cmd/openapi.json  # 200
```

Repeat the route+plugin attach for another service (e.g., `/dev` → device-service) to gradually roll out.

### OIDC plugin (optional)

If using Kong Enterprise/Konnect, prefer the OIDC plugin with discovery instead of the OSS JWT plugin. Configure with the realm discovery URL from Keycloak and set audience/issuer as needed. CI can validate 401/200 using temporary routes in the same pattern.

Example (Enterprise/Konnect only):

```bash
# Assumes Keycloak is running (profile: auth) and gateway admin is exposed on :8001
DISCO_URL="http://localhost:8080/realms/systemupdate-dev/.well-known/openid-configuration"

# 1) Create a temporary route to command-service (path /oidc-cmd)
curl -s -X POST http://localhost:8001/services/command-service/routes \
  -d name=oidc-cmd-route -d 'paths[]=/oidc-cmd' -d strip_path=true | jq .

# 2) Attach the OIDC plugin in bearer-only mode (no redirects)
curl -s -X POST http://localhost:8001/routes/oidc-cmd-route/plugins \
  -d name=oidc \
  -d config.bearer_only=true \
  -d config.auth_methods=bearer \
  -d config.realm=systemupdate-dev \
  -d config.discovery="$DISCO_URL" \
  -d config.client_id=systemupdate-api | jq .

# 3) Obtain an access token from Keycloak and call via gateway
TOKEN=$(curl -s -X POST \
  -d 'client_id=frontend' -d 'grant_type=password' \
  -d 'username=devuser' -d 'password=devpass' \
  http://localhost:8080/realms/systemupdate-dev/protocol/openid-connect/token | jq -r '.access_token')

curl -i http://localhost:8000/oidc-cmd/openapi.json                                 # expect 401
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8000/oidc-cmd/openapi.json  # expect 200
```

Troubleshooting:

- 401 with token: verify `config.discovery` URL is reachable from Kong container, `client_id` matches a Keycloak client, and the token audience is acceptable by the plugin.
- 403: check scopes/claims if you enabled `config.scopes` or `config.roles_claim`. Start minimal and add constraints later.
- Plugin not found: OIDC is an Enterprise/Konnect plugin; ensure your image/license enables it.

## Troubleshooting

- 404s: ensure you are hitting the correct route prefix listed above.
- 401/403: security toggles may be on; see `docs/AUTH_GUIDE.md`.
- CORS in browser: confirm requests go via `http://localhost:8000` and not directly to a service port.
- Windows/WSL2, Docker engine tips: see `docs/WINDOWS_SETUP.md`.
