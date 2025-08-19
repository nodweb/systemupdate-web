# Services

Microservices defined by `docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`.

- api-gateway
- auth-service
- device-service
- command-service
- data-ingest-service
- analytics-service
- ws-hub
- notification-service

## Quick Start: Security Toggles (all services)

Enable auth/authz (and optional OPA) for any service in your current shell. See `docs/AUTH_GUIDE.md` for details.

```powershell
# JWT + auth-service authorization
$Env:AUTH_REQUIRED = '1'
$Env:AUTHZ_REQUIRED = '1'
$Env:AUTH_INTROSPECT_URL = 'http://localhost:8011/auth/introspect'
$Env:AUTH_AUTHORIZE_URL  = 'http://localhost:8011/auth/authorize'

# Optional: OPA policy enforcement
$Env:OPA_REQUIRED = '1'
$Env:OPA_URL = 'http://localhost:8181/v1/data/systemupdate/allow'
$Env:OPA_TIMEOUT = '2.0'

# Optional: developer bypass for local testing
$Env:AUTH_DEV_ALLOW_ANY = '1'
$Env:AUTH_DEV_SCOPE = 'read write admin'
