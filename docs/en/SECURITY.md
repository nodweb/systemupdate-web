# Security

- Transport: TLS 1.2+
- Auth: JWT access/refresh, secure cookies (prod)
- Android: Certificate Pinning via OkHttp `CertificatePinner` (release), Anti-Debug/Root checks
- Backend: CORS, rate limiting, security headers (see `backend/app/config_prod.py`)
- Outbox: reliable event emission, legacy event maintained for compatibility

Validation evidence: ../SECURITY_VALIDATION_REPORT.md
