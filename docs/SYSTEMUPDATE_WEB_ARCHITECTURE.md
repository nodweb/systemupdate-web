# SystemUpdate-Web Architecture (Enterprise-Grade)

Ù‡Ø¯Ù: Ú©Ù†ØªØ±Ù„ Ø§Ø² Ø±Ø§Ù‡ Ø¯ÙˆØ± Ø¯Ø³ØªÚ¯Ø§Ù‡â€ŒÙ‡Ø§ÛŒ Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯ Ø¨Ø§ Ø³Ø±Ø¹Øª Ø¨Ø§Ù„Ø§ØŒ Ù‡Ù…Ø§Ù‡Ù†Ú¯ØŒ Ø§Ù…Ù† Ùˆ Ù…Ù‚ÛŒØ§Ø³â€ŒÙ¾Ø°ÛŒØ± Ø§Ø² Ø·Ø±ÛŒÙ‚ Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ ÙˆØ¨ Ù…Ø¯ÛŒØ±ÛŒØª. Ø§ÛŒÙ† Ø³Ù†Ø¯ Ù…Ø¹Ù…Ø§Ø±ÛŒØŒ ÙØ§Ø²Ù‡Ø§ÛŒ Ø¯ÙˆÙ… ØªØ§ Ú†Ù‡Ø§Ø±Ù… (Backend, Frontend, Infra) Ø±Ø§ ØªØ¹Ø±ÛŒÙ Ù…ÛŒâ€ŒÚ©Ù†Ø¯.

---

## 1) Ù„Ø§ÛŒÙ‡â€ŒÙ‡Ø§ Ùˆ Ø³Ø±ÙˆÛŒØ³â€ŒÙ‡Ø§ (Microservices + Event-Driven)

- **API Gateway (Kong/Envoy/Traefik)**
  - Routing, Rate Limit, AuthN/AuthZ offloading, mTLS, WAF, Request/Response transform
- **Auth Service (FastAPI, async)**
  - OAuth2/OIDC (Keycloak/Auth0), JWT RS256 + rotation, Refresh Tokens
  - RBAC/ABAC Ø¨Ø§ OPA/OPALØŒ Ù¾Ø§Ù„ÛŒØ³ÛŒâ€ŒÙ‡Ø§ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ú©Ø¯ (Rego)
- **Device Service (FastAPI, async)**
  - Ø±Ø¬ÛŒØ³ØªØ±ÛŒ Ùˆ Ù…ØªØ§Ø¯ÛŒØªØ§ÛŒ Ø¯Ø³ØªÚ¯Ø§Ù‡ØŒ ÙˆØ¶Ø¹ÛŒØª Ø¢Ù†Ù„Ø§ÛŒÙ†/Ø­Ø¶ÙˆØ± (presence)ØŒ health, tags
  - Query/read model Ø¨Ø±Ø§ÛŒ Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ (CQRS read model)
- **Command Service (FastAPI + Worker)**
  - Ø§ÛŒØ¬Ø§Ø¯/ØµÙ/Ù¾ÛŒÚ¯ÛŒØ±ÛŒ Ø¯Ø³ØªÙˆØ±Ø§ØªØŒ Ø§Ù„Ú¯ÙˆÛŒ Saga/OutboxØŒ retries, idempotency keys
  - Ø§Ù†ØªØ´Ø§Ø± Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§ Ø¯Ø± Kafka (command.created, command.dispatched, command.succeeded/failed)
- **Data Ingest Service (FastAPI, async)**
  - Ø¯Ø±ÛŒØ§ÙØª Ø¬Ø±ÛŒØ§Ù† Ø¯Ø§Ø¯Ù‡ (HTTP/WS/gRPC) Ø§Ø² Ú©Ù„Ø§ÛŒÙ†Øª Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯ØŒ validation (Pydantic v2), enrichment
  - Ù…Ø³ÛŒØ±Ø¯Ù‡ÛŒ Ø¨Ù‡ Kafka topics Ùˆ storage (OLTP/Analytics/Object storage)
- **Analytics Service (FastAPI, async + Batch Workers)**
  - Ù…Ø­Ø§Ø³Ø¨Ø§Øª Ø¢Ù†Ù„Ø§ÛŒÙ† (stream processing Ø¨Ø§ Faust/kafka-streams) Ùˆ Ø¢ÙÙ„Ø§ÛŒÙ† (batch Ø¨Ø§ Celery)
  - Ù…Ø¯Ù„â€ŒÙ‡Ø§ÛŒ Ø¢Ù…Ø§Ø±ÛŒØŒ KPIsØŒ Ú¯Ø²Ø§Ø±Ø´â€ŒÚ¯ÛŒØ±ÛŒØŒ Ù¾Ø±ÙˆÙØ§ÛŒÙ„ Ø¯Ø³ØªÚ¯Ø§Ù‡/Ú©Ø§Ø±Ø¨Ø±
- **WebSocket Hub (ASGI, Socket.IO/WebSocket)**
  - Ø§ØªØµØ§Ù„ Ø¯ÙˆØ³ÙˆÛŒÙ‡ Ø¨Ø§ Ø¯Ø³ØªÚ¯Ø§Ù‡â€ŒÙ‡Ø§ Ùˆ Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ØŒ sharding roomsØŒ backpressure
  - Ù…Ù‚ÛŒØ§Ø³â€ŒÙ¾Ø°ÛŒØ± Ø¨Ø§ Redis pub/sub ÛŒØ§ KafkaØŒ token binding Ùˆ resume/reconnect
- **Notification Service**
  - Email/Push/Webhook Ø¨Ø§ templatesØŒ throttling/rate limiting

Ø§Ø±ØªØ¨Ø§Ø·Ø§Øª:

- External: HTTPS + HTTP/2, WebSocket over TLS (WSS)
- Internal: gRPC Ø¨Ø±Ø§ÛŒ RPC Ø¨ÛŒÙ† Ø³Ø±ÙˆÛŒØ³â€ŒÙ‡Ø§Ø› Kafka Ø¨Ø±Ø§ÛŒ Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§ØŒ RabbitMQ Ø§Ø®ØªÛŒØ§Ø±ÛŒ Ø¨Ø±Ø§ÛŒ ØµÙâ€ŒÙ‡Ø§ÛŒ Ø§ÙˆÙ„ÙˆÛŒØªâ€ŒØ¯Ø§Ø±

---

## 2) Ø°Ø®ÛŒØ±Ù‡â€ŒØ³Ø§Ø²ÛŒ Ùˆ Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§

- **PostgreSQL (OLTP)**
  - Ú©Ø§Ø±Ø¨Ø±Ø§Ù†ØŒ Ø¯Ø³ØªÚ¯Ø§Ù‡â€ŒÙ‡Ø§ØŒ Ø¯Ø³ØªÙˆØ±Ø§ØªØŒ audit logs (critical)Ø› Ø§ÛŒÙ†Ø¯Ú©Ø³â€ŒÚ¯Ø°Ø§Ø±ÛŒØŒ partitioning Ø¯Ø± Ø¬Ø¯Ø§ÙˆÙ„ Ø­Ø¬ÛŒÙ…
- **TimescaleDB/ClickHouse (Analytics/TSDB)**
  - Ù…ØªØ±ÛŒÚ©â€ŒÙ‡Ø§/Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§/Ù„Ø§Ú¯â€ŒÙ‡Ø§ÛŒ Ø³Ø§Ø®ØªØ§Ø±Ù…Ù†Ø¯ Ø­Ø¬ÛŒÙ…ØŒ queryÙ‡Ø§ÛŒ ØªØ¬Ù…ÛŒØ¹ÛŒ Ø³Ø±ÛŒØ¹
- **Redis Cluster**
  - CacheØŒ sessionØŒ rate limitØŒ WS pub/sub Ùˆ presence state
- **Object Storage (S3-compatible)**
  - ÙØ§ÛŒÙ„â€ŒÙ‡Ø§/Ø¶Ù…Ø§Ø¦Ù…/Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§/exportsØŒ lifecycle rules Ùˆ encryption at rest
- **Schema Registry (Protobuf/Avro)**
  - Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ù¾Ø§ÛŒØ¯Ø§Ø± Ø¨Ø±Ø§ÛŒ Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§ (versioned schemas)
- **CQRS + Outbox**
  - read models Ø¨Ù‡ÛŒÙ†Ù‡ Ø¨Ø±Ø§ÛŒ UIØ› Outbox Ø¨Ø±Ø§ÛŒ ØªØ­ÙˆÛŒÙ„ ØªØ¶Ù…ÛŒÙ†ÛŒ Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§ Ø§Ø² ØªØ±Ø§Ú©Ù†Ø´ DB

---

## 3) Ø§Ù…Ù†ÛŒØª

- Zero-TrustØŒ mTLS Ø¯Ø§Ø®Ù„ÛŒ Ø¨ÛŒÙ† Ø³Ø±ÙˆÛŒØ³â€ŒÙ‡Ø§ (mesh ÛŒØ§ sidecarless)
- Secret Management: Vault/KMSØŒ rotationØŒ dynamic secrets
- OAuth2/OIDC (Keycloak/Auth0)ØŒ JWT RS256ØŒ PASETO (Ú¯Ø²ÛŒÙ†Ù‡)
- OPA/OPAL Ø¨Ø±Ø§ÛŒ RBAC/ABACØŒ Policy-as-Code (Rego)ØŒ decision logs
- WAF Ø¯Ø± GatewayØŒ DDoS ProtectionØŒ Ratelimit/Spike Arrest
- Input/Output validation (Pydantic v2)ØŒ canonicalizationØŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² injection
- Audit Log Ú©Ø§Ù…Ù„ Ùˆ ØºÛŒØ±Ù‚Ø§Ø¨Ù„ ØªØºÛŒÛŒØ± (WORM, hash chain)

---

## 4) Ø±ØµØ¯Ù¾Ø°ÛŒØ±ÛŒ Ùˆ Ú©ÛŒÙÛŒØª

- OpenTelemetry (Tracing/Metrics/Logs) â†’ Tempo/Jaeger + Prometheus + Grafana
- Structured JSON loggingØŒ trace/correlation IDs Ø³Ø±Ø§Ø³Ø±ÛŒ
- SLO/SLAØŒ Error BudgetsØŒ health/status endpointsØŒ synthetic checks (k6/blackbox)
- Quality Gates: SCA/SAST/DASTØŒ SBOM (Syft), signing (Sigstore/Cosign)

---

## 5) Frontend (SPA)

- React 18 + TypeScript + MUI + Redux Toolkit + RTK Query + React Router

- WebSocket client Ø¨Ø§ backoff + resumeØ› Offline queue Ø¨Ø±Ø§ÛŒ Ø¯Ø³ØªÙˆØ±Ø§Øª

- Design System + StorybookØ› i18n Ø¨Ø§ react-i18nextØ› Theme dark/light

- Ø³Ø§Ø®ØªØ§Ø±:

```text
frontend/src/
  app/ (store, providers)
  features/ (auth, devices, commands, analytics)
  services/ (rtk-query api, websocket client)
  components/ (ui primitives, charts)
  pages/ (Dashboard, Devices, DeviceDetails, Commands, Analytics)
  routes/
```

---

## 6) Ø§Ø³ØªÙ‚Ø±Ø§Ø± Ùˆ Ø²ÛŒØ±Ø³Ø§Ø®Øª

- Kubernetes + Helm + GitOps (ArgoCD)
- CI/CD (GitHub Actions): build/test/lint/SCA, SBOM, SAST/DAST, e2e, deploy progressive
- Ingress + Letâ€™s EncryptØŒ HPA/VPAØŒ PodDisruptionBudgetØŒ PDB/PSP Ø¨Ø¯ÛŒÙ„â€ŒÙ‡Ø§
- Blue/Green & Canary (Argo Rollouts)ØŒ progressive delivery
- Environments: dev/stage/prod Ø¨Ø§ secrets Ùˆ configs Ù…Ø¬Ø²Ø§

---

## 7) ØªÙˆÙ¾ÙˆÙ„ÙˆÚ˜ÛŒ Ù†Ù…ÙˆÙ†Ù‡

```text
Internet â†’ CDN â†’ API Gateway/WAF â†’ (Auth, Device, Command, Data Ingest, Analytics, WS Hub)
                                  â†˜ gRPC mesh â†” Redis Cluster â†” PostgreSQL (primary/replica)
                                                   â†˜ Kafka (events) â†” Workers (Celery/Faust)
                                                   â†˜ S3 Object Storage
                                                   â†˜ ClickHouse/TimescaleDB (analytics)
```

---

## 8) Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯Ù‡Ø§ Ùˆ Ù†Ø³Ø®Ù‡â€ŒØ¨Ù†Ø¯ÛŒ

- API Ù†Ø³Ø®Ù‡â€ŒØ¯Ø§Ø± (`/api/v1`, `/api/v2`)ØŒ OpenAPI 3.1ØŒ ØªØ³Øª Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ (Schemathesis)
- Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§ Ù†Ø³Ø®Ù‡â€ŒØ¯Ø§Ø± (Protobuf/Avro)ØŒ Ø³Ø§Ø²Ú¯Ø§Ø±ÛŒ Ø¹Ù‚Ø¨/Ø¬Ù„ÙˆØ› migrations Ú©Ù†ØªØ±Ù„â€ŒØ´Ø¯Ù‡

---

## 9) Ø§Ù…Ù†ÛŒØª Ø¯Ø§Ø¯Ù‡ Ùˆ Ø­Ø±ÛŒÙ… Ø®ØµÙˆØµÛŒ

- Token Binding Ø¨Ø±Ø§ÛŒ WebSocketØŒ Ù…Ø­Ø¯ÙˆØ¯Ø³Ø§Ø²ÛŒ Ø¯Ø§Ù…Ù†Ù‡ Ø¯Ø³ØªØ±Ø³ÛŒ Ø¯Ø³ØªÙˆØ±Ø§Øª
- Ø§Ù…Ø¶Ø§ Ùˆ timestamp Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ØŒ replay protectionØŒ nonce
- Data RetentionØŒ GDPR-readinessØŒ Data Masking/Tokenization Ø¨Ø±Ø§ÛŒ Ù„Ø§Ú¯â€ŒÙ‡Ø§

---

## 10) Ø¨Ø±Ù†Ø§Ù…Ù‡â€ŒØ±ÛŒØ²ÛŒ Ø¸Ø±ÙÛŒØª Ùˆ Ù‡Ø²ÛŒÙ†Ù‡

- HPA/AutoscalingØŒ storage tieringØŒ observability-driven capacity planning
- Kafka backbone Ø¨Ø±Ø§ÛŒ Ù†Ø±Ø® Ø¨Ø§Ù„Ø§ÛŒ Ø±ÙˆÛŒØ¯Ø§Ø¯Ø› RabbitMQ Ø¨Ø±Ø§ÛŒ Ø§ÙˆÙ„ÙˆÛŒØª/TTL/dlx

---

## 11) Ø¨Ø±Ù†Ø§Ù…Ù‡ Ù¾ÛŒØ§Ø¯Ù‡â€ŒØ³Ø§Ø²ÛŒ (Milestones)

- M0: Monorepo scaffold, CI lint/test, base Helm charts, local dev (docker-compose)
- M1: Auth + API Gateway + Device Service (CRUD, presence minimal), WS Hub v1
- M2: Command Service (create/dispatch/track), Android client integration, Outbox events
- M3: Data Ingest + Analytics (stream/batch minimal), dashboards basic
- M4: Notifications, advanced RBAC/ABAC (OPA), audit trails hardened
- M5: Scale-out (Redis/Kafka clusters), canary deploy, load tests + hardening

---

## 12) Monorepo Ø³Ø§Ø®ØªØ§Ø± Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ÛŒ

```text
systemupdate-web/
  services/
    api-gateway/ (config, declarative)
    auth-service/
    device-service/
    command-service/
    data-ingest-service/
    analytics-service/
    ws-hub/
    notification-service/
  frontend/
  libs/
    proto-schemas/
    shared-python/ (pydantic models, clients)
    shared-ts/ (types, api clients)
  deployments/
    helm/
    kustomize/
  .github/workflows/
  docs/
```

---

## 13) Ø§Ù†ØªØ®Ø§Ø¨ ÙÙ†Ø§ÙˆØ±ÛŒâ€ŒÙ‡Ø§

- Backend: Python 3.12, FastAPI (async), Uvicorn/Gunicorn, Pydantic v2
- Streaming: Kafka + Faust (ÛŒØ§ kafka-streams Ù…Ø¹Ø§Ø¯Ù„)ØŒ Schema Registry
- Workers: Celery/Arq/RQ (ØªØ±Ø¬ÛŒØ­ Celery Ø¨Ø§ Redis/Kafka)
- Storage: PostgreSQL 15+, ClickHouse 24+, Redis 7+, MinIO/S3
- Auth: Keycloak (self-hosted) ÛŒØ§ Auth0 (managed)
- Gateway: Kong OSS/Enterprise ÛŒØ§ Envoy + Control Plane
- Frontend: React 18, TS 5, MUI v6, RTK Query
- Infra: K8s 1.29+, Helm, ArgoCD, Argo Rollouts, GitHub Actions

---

## 14) Ø§Ø³ØªØ§Ù†Ø¯Ø§Ø±Ø¯Ù‡Ø§ÛŒ Ú©ÛŒÙÛŒ Ùˆ ØªØ³Øª

- Unit/Integration Tests (pytest + httpx + pytest-asyncio), contract tests (Schemathesis)
- Testcontainers Ø¨Ø±Ø§ÛŒ DB/Redis/Kafka Ø¯Ø± CI
- E2E (Playwright) Ø¨Ø±Ø§ÛŒ Frontend + WS flows
- Chaos/Resilience tests (Toxiproxy), Ú©Ù„Ø§Ù‡ Ø§ÛŒÙ…Ù†ÛŒ (backoff/jitter/timeout)

---

## 15) Ù†Ú©Ø§Øª Ø¹Ù…Ù„ÛŒØ§ØªÛŒ

- Configuration-as-Code (Helm/Kustomize)ØŒ Drift detection
- Backup/Restore (pgBackRest, Velero), DR strategy
- Cost monitoring Ùˆ right-sizing Ù…Ø¯Ø§ÙˆÙ…

---

## 16) Ù‡Ù…â€ŒØ±Ø§Ø³ØªØ§ÛŒÛŒ Ø¨Ø§ Android Phase 1

- Token binding Ùˆ pinning Ù‡Ù…â€ŒØ¬Ù‡Øª Ø¨Ø§ OkHttp/TLS Ø¯Ø± Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯
- Backoff Ùˆ heartbeat Ù…Ù†Ø·Ø¨Ù‚ Ø¨ÛŒÙ† WebSocket Hub Ùˆ Ú©Ù„Ø§ÛŒÙ†Øª
- Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯Ù‡Ø§ÛŒ gRPC/HTTP/WS Ù‡Ù…Ø§Ù‡Ù†Ú¯ Ø¨Ø§ BuildConfig Ùˆ policyÙ‡Ø§

---

## 17) ÙˆØ¶Ø¹ÛŒØª ÙØ¹Ù„ÛŒ Ù¾ÛŒØ§Ø¯Ù‡â€ŒØ³Ø§Ø²ÛŒ (M0 Snapshot)

- Ø³Ø±ÙˆÛŒØ³â€ŒÙ‡Ø§: `auth-service`, `device-service`, `ws-hub` (FastAPI/ASGI)
- ØªØ³Øªâ€ŒÙ‡Ø§: Ø­Ø¯Ø§Ù‚Ù„ÛŒ Ùˆ Ø³Ø¨ÙÚ© Ø¨Ø±Ø§ÛŒ CI Ø³Ø¨Ø²Ø› Ø§Ø¬Ø±Ø§ÛŒ ØªØ¬Ù…ÛŒØ¹ÛŒ Ø¨Ø§ `systemupdate-web/pytest.ini`
- Ú©Ø¯Ø¬Ù†: OpenAPI â†’ TypeScript (`libs/shared-ts/types/*.d.ts`) Ùˆ Python clients (`libs/shared-python/clients/*`)
- CI: GitHub Actions (pytestØŒ SBOM+TrivyØŒ Python/TS codegenØŒ markdownlint)
- Docker Compose: ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ `docker-compose.yml` Ùˆ `docker-compose.prod.yml` (Traefik)
- Ù…Ø³ØªÙ†Ø¯Ø§Øª: `systemupdate-web/docs/TEST_GUIDE.md`, `REAL_TESTS_PREP.md`, `VPS_AND_DOMAIN_SETUP.md`

### Links

- `systemupdate-web/docs/TEST_GUIDE.md`
- `systemupdate-web/docs/REAL_TESTS_PREP.md`
- `systemupdate-web/docs/VPS_AND_DOMAIN_SETUP.md`

---

## 18) Ø´Ú©Ø§Ùâ€ŒÙ‡Ø§ Ùˆ Ú¯Ø§Ù…â€ŒÙ‡Ø§ÛŒ Ø¨Ø¹Ø¯ÛŒ (Gaps & Next Actions)

- Backend
  - [ ] Ù¾ÛŒØ§Ø¯Ù‡â€ŒØ³Ø§Ø²ÛŒ `command-service` (create/dispatch/track)ØŒ Ø§Ù„Ú¯ÙˆÛŒ Outbox
  - [ ] `data-ingest-service` (HTTP/WS/gRPC ingest) + Ù…Ø³ÛŒØ± Ø¨Ù‡ Kafka/Storage
  - [ ] `analytics-service` (stream/batch Ø­Ø¯Ø§Ù‚Ù„ÛŒ) + Ø´Ø§Ø®Øµâ€ŒÙ‡Ø§/Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§ÛŒ Ø§ÙˆÙ„ÛŒÙ‡
  - [ ] `notification-service` (Email/Webhook) + throttling
  - [ ] API Gateway (Kong/Envoy) Ø¨Ø§ authn/zØŒ rate-limitØŒ WAF
- Data/Infra
  - [ ] Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø±Ø¯Ù† PostgreSQL/Redis/Kafka Ø¨Ù‡ Compose Ùˆ Ø³Ù¾Ø³ Helm/K8s charts (deployments/)
  - [ ] Schema Registry Ùˆ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§ (Avro/Protobuf) + ÙˆØ±Ú˜Ù†â€ŒØ¯Ù‡ÛŒ
  - [ ] Observability Ú©Ø§Ù…Ù„ (OTel collector + Prometheus + Grafana + Tempo/Jaeger)
- Security
  - [ ] Keycloak/Auth0 Ø§Ø¯ØºØ§Ù… OIDC ÙˆØ§Ù‚Ø¹ÛŒ + Ø¬Ø±ÛŒØ§Ù† JWT/JWKS Ø¯Ø± Ø³Ø±ÙˆÛŒØ³â€ŒÙ‡Ø§
  - [ ] OPA/OPAL Policy-as-Code + ØªØµÙ…ÛŒÙ…â€ŒÙ†Ú¯Ø§Ø±ÛŒ Ù…Ø±Ú©Ø²ÛŒ
  - [ ] Audit Trail ØºÛŒØ±Ù‚Ø§Ø¨Ù„â€ŒØªØºÛŒÛŒØ± Ùˆ Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§ÛŒ Ø§Ù…Ù†ÛŒØªÛŒ
- Frontend
  - [ ] Ø§Ø³Ú©Ù„Øª React/TS + MUI + RTK Query + WS client
  - [ ] ØµÙØ­Ø§Øª Ø§ÙˆÙ„ÛŒÙ‡: Dashboard/Devices/DeviceDetails/Commands/Analytics
- Testing
  - [ ] Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ ØªØ¯Ø±ÛŒØ¬ÛŒ ØªØ³Øªâ€ŒÙ‡Ø§ÛŒ ÙˆØ§Ù‚Ø¹ÛŒ (contract/integration) Ø¨Ù‡â€ŒØ¬Ø§ÛŒ placeholders
  - [ ] Testcontainers Ø¨Ø±Ø§ÛŒ DB/Redis/Kafka Ø¯Ø± CI
  - [ ] E2E (Playwright) Ø¨Ø±Ø§ÛŒ Web + WS flows
- CI/CD Ùˆ Ú©ÛŒÙÛŒØª
  - [ ] Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø±Ø¯Ù† Python lint (ruff) Ùˆ TS lint/format (eslint/prettier)
  - [ ] Ø³ÙØªâ€ŒÚ©Ø±Ø¯Ù† Trivy Ø¨Ø§ policyâ€ŒÙ‡Ø§ÛŒ ignore Ú©Ù†ØªØ±Ù„â€ŒØ´Ø¯Ù‡ Ùˆ Ø¢Ø³ØªØ§Ù†Ù‡ Ø´Ú©Ø³Øª Ù…Ø³ØªÙ†Ø¯
  - [ ] SBOM signing (Cosign) Ùˆ Ø§Ù†ØªØ´Ø§Ø± artifactÙ‡Ø§

ØªØ±ØªÛŒØ¨ Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ÛŒ Ø§Ø¬Ø±Ø§ (M0â†’M1):

1) ØªÚ©Ù…ÛŒÙ„ CI lintÙ‡Ø§ (ruff/eslint) Ùˆ Ù¾Ø§ÛŒØ¯Ø§Ø±Ø³Ø§Ø²ÛŒ ØªØ³Øªâ€ŒÙ‡Ø§ÛŒ Ø³Ø¨ÙÚ©
2) Ø§ÙØ²ÙˆØ¯Ù† Postgres/Redis Ø¨Ù‡ Compose Ùˆ health checks
3) Ø´Ø±ÙˆØ¹ `command-service` + Outbox + Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§
4) Ø§Ø³Ú©Ù„Øª Frontend Ùˆ Ø§ØªØµØ§Ù„ Ø¨Ù‡ auth/device/ws-hub
5) Ø¢Ù…Ø§Ø¯Ù‡â€ŒØ³Ø§Ø²ÛŒ VPS Ø¨Ø±Ø§ÛŒ ØªØ³Øªâ€ŒÙ‡Ø§ÛŒ ÙˆØ§Ù‚Ø¹ÛŒ (Ø²Ù…Ø§Ù† Ù…Ù†Ø§Ø³Ø¨)
