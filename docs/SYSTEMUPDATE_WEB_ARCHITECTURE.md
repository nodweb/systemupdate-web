# SystemUpdate-Web Architecture (Enterprise-Grade)

هدف: کنترل از راه دور دستگاه‌های اندروید با سرعت بالا، هماهنگ، امن و مقیاس‌پذیر از طریق داشبورد وب مدیریت. این سند معماری، فازهای دوم تا چهارم (Backend, Frontend, Infra) را تعریف می‌کند.

---

## 1) لایه‌ها و سرویس‌ها (Microservices + Event-Driven)
 
- **API Gateway (Kong/Envoy/Traefik)**
  - Routing, Rate Limit, AuthN/AuthZ offloading, mTLS, WAF, Request/Response transform
- **Auth Service (FastAPI, async)**
  - OAuth2/OIDC (Keycloak/Auth0), JWT RS256 + rotation, Refresh Tokens
  - RBAC/ABAC با OPA/OPAL، پالیسی‌ها به‌صورت کد (Rego)
- **Device Service (FastAPI, async)**
  - رجیستری و متادیتای دستگاه، وضعیت آنلاین/حضور (presence)، health, tags
  - Query/read model برای داشبورد (CQRS read model)
- **Command Service (FastAPI + Worker)**
  - ایجاد/صف/پیگیری دستورات، الگوی Saga/Outbox، retries, idempotency keys
  - انتشار رویدادها در Kafka (command.created, command.dispatched, command.succeeded/failed)
- **Data Ingest Service (FastAPI, async)**
  - دریافت جریان داده (HTTP/WS/gRPC) از کلاینت اندروید، validation (Pydantic v2), enrichment
  - مسیردهی به Kafka topics و storage (OLTP/Analytics/Object storage)
- **Analytics Service (FastAPI, async + Batch Workers)**
  - محاسبات آنلاین (stream processing با Faust/kafka-streams) و آفلاین (batch با Celery)
  - مدل‌های آماری، KPIs، گزارش‌گیری، پروفایل دستگاه/کاربر
- **WebSocket Hub (ASGI, Socket.IO/WebSocket)**
  - اتصال دوسویه با دستگاه‌ها و داشبورد، sharding rooms، backpressure
  - مقیاس‌پذیر با Redis pub/sub یا Kafka، token binding و resume/reconnect
- **Notification Service**
  - Email/Push/Webhook با templates، throttling/rate limiting

ارتباطات:
 
- External: HTTPS + HTTP/2, WebSocket over TLS (WSS)
- Internal: gRPC برای RPC بین سرویس‌ها؛ Kafka برای رویدادها، RabbitMQ اختیاری برای صف‌های اولویت‌دار

---

## 2) ذخیره‌سازی و داده‌ها
 
- **PostgreSQL (OLTP)**
  - کاربران، دستگاه‌ها، دستورات، audit logs (critical)؛ ایندکس‌گذاری، partitioning در جداول حجیم
- **TimescaleDB/ClickHouse (Analytics/TSDB)**
  - متریک‌ها/رویدادها/لاگ‌های ساختارمند حجیم، queryهای تجمیعی سریع
- **Redis Cluster**
  - Cache، session، rate limit، WS pub/sub و presence state
- **Object Storage (S3-compatible)**
  - فایل‌ها/ضمائم/گزارش‌ها/exports، lifecycle rules و encryption at rest
- **Schema Registry (Protobuf/Avro)**
  - قرارداد پایدار برای رویدادها (versioned schemas)
- **CQRS + Outbox**
  - read models بهینه برای UI؛ Outbox برای تحویل تضمینی رویدادها از تراکنش DB

---

## 3) امنیت
 
- Zero-Trust، mTLS داخلی بین سرویس‌ها (mesh یا sidecarless)
- Secret Management: Vault/KMS، rotation، dynamic secrets
- OAuth2/OIDC (Keycloak/Auth0)، JWT RS256، PASETO (گزینه)
- OPA/OPAL برای RBAC/ABAC، Policy-as-Code (Rego)، decision logs
- WAF در Gateway، DDoS Protection، Ratelimit/Spike Arrest
- Input/Output validation (Pydantic v2)، canonicalization، جلوگیری از injection
- Audit Log کامل و غیرقابل تغییر (WORM, hash chain)

---

## 4) رصدپذیری و کیفیت
 
- OpenTelemetry (Tracing/Metrics/Logs) → Tempo/Jaeger + Prometheus + Grafana
- Structured JSON logging، trace/correlation IDs سراسری
- SLO/SLA، Error Budgets، health/status endpoints، synthetic checks (k6/blackbox)
- Quality Gates: SCA/SAST/DAST، SBOM (Syft), signing (Sigstore/Cosign)

---

## 5) Frontend (SPA)
 
- React 18 + TypeScript + MUI + Redux Toolkit + RTK Query + React Router
 
- WebSocket client با backoff + resume؛ Offline queue برای دستورات
 
- Design System + Storybook؛ i18n با react-i18next؛ Theme dark/light
 
- ساختار:
 
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

## 6) استقرار و زیرساخت
 
- Kubernetes + Helm + GitOps (ArgoCD)
- CI/CD (GitHub Actions): build/test/lint/SCA, SBOM, SAST/DAST, e2e, deploy progressive
- Ingress + Let’s Encrypt، HPA/VPA، PodDisruptionBudget، PDB/PSP بدیل‌ها
- Blue/Green & Canary (Argo Rollouts)، progressive delivery
- Environments: dev/stage/prod با secrets و configs مجزا

---

## 7) توپولوژی نمونه
 
```text
Internet → CDN → API Gateway/WAF → (Auth, Device, Command, Data Ingest, Analytics, WS Hub)
                                  ↘ gRPC mesh ↔ Redis Cluster ↔ PostgreSQL (primary/replica)
                                                   ↘ Kafka (events) ↔ Workers (Celery/Faust)
                                                   ↘ S3 Object Storage
                                                   ↘ ClickHouse/TimescaleDB (analytics)
```

---

## 8) قراردادها و نسخه‌بندی
 
- API نسخه‌دار (`/api/v1`, `/api/v2`)، OpenAPI 3.1، تست قرارداد (Schemathesis)
- رویدادها نسخه‌دار (Protobuf/Avro)، سازگاری عقب/جلو؛ migrations کنترل‌شده

---

## 9) امنیت داده و حریم خصوصی
 
- Token Binding برای WebSocket، محدودسازی دامنه دسترسی دستورات
- امضا و timestamp درخواست‌ها، replay protection، nonce
- Data Retention، GDPR-readiness، Data Masking/Tokenization برای لاگ‌ها

---

## 10) برنامه‌ریزی ظرفیت و هزینه
 
- HPA/Autoscaling، storage tiering، observability-driven capacity planning
- Kafka backbone برای نرخ بالای رویداد؛ RabbitMQ برای اولویت/TTL/dlx

---

## 11) برنامه پیاده‌سازی (Milestones)
 
- M0: Monorepo scaffold, CI lint/test, base Helm charts, local dev (docker-compose)
- M1: Auth + API Gateway + Device Service (CRUD, presence minimal), WS Hub v1
- M2: Command Service (create/dispatch/track), Android client integration, Outbox events
- M3: Data Ingest + Analytics (stream/batch minimal), dashboards basic
- M4: Notifications, advanced RBAC/ABAC (OPA), audit trails hardened
- M5: Scale-out (Redis/Kafka clusters), canary deploy, load tests + hardening

---

## 12) Monorepo ساختار پیشنهادی
 
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

## 13) انتخاب فناوری‌ها
 
- Backend: Python 3.12, FastAPI (async), Uvicorn/Gunicorn, Pydantic v2
- Streaming: Kafka + Faust (یا kafka-streams معادل)، Schema Registry
- Workers: Celery/Arq/RQ (ترجیح Celery با Redis/Kafka)
- Storage: PostgreSQL 15+, ClickHouse 24+, Redis 7+, MinIO/S3
- Auth: Keycloak (self-hosted) یا Auth0 (managed)
- Gateway: Kong OSS/Enterprise یا Envoy + Control Plane
- Frontend: React 18, TS 5, MUI v6, RTK Query
- Infra: K8s 1.29+, Helm, ArgoCD, Argo Rollouts, GitHub Actions

---

## 14) استانداردهای کیفی و تست
 
- Unit/Integration Tests (pytest + httpx + pytest-asyncio), contract tests (Schemathesis)
- Testcontainers برای DB/Redis/Kafka در CI
- E2E (Playwright) برای Frontend + WS flows
- Chaos/Resilience tests (Toxiproxy), کلاه ایمنی (backoff/jitter/timeout)

---

## 15) نکات عملیاتی
 
- Configuration-as-Code (Helm/Kustomize)، Drift detection
- Backup/Restore (pgBackRest, Velero), DR strategy
- Cost monitoring و right-sizing مداوم

---

## 16) هم‌راستایی با Android Phase 1

- Token binding و pinning هم‌جهت با OkHttp/TLS در اندروید
- Backoff و heartbeat منطبق بین WebSocket Hub و کلاینت
- قراردادهای gRPC/HTTP/WS هماهنگ با BuildConfig و policyها

---

## 17) وضعیت فعلی پیاده‌سازی (M0 Snapshot)

- سرویس‌ها: `auth-service`, `device-service`, `ws-hub` (FastAPI/ASGI)
- تست‌ها: حداقلی و سبُک برای CI سبز؛ اجرای تجمیعی با `systemupdate-web/pytest.ini`
- کدجن: OpenAPI → TypeScript (`libs/shared-ts/types/*.d.ts`) و Python clients (`libs/shared-python/clients/*`)
- CI: GitHub Actions (pytest، SBOM+Trivy، Python/TS codegen، markdownlint)
- Docker Compose: فایل‌های `docker-compose.yml` و `docker-compose.prod.yml` با Gateway مبتنی بر Kong (Declarative Config). از پروفایل‌ها برای فعال‌سازی اختیاری سرویس‌ها و از `healthcheck`ها برای آمادگی استفاده می‌شود. پروفایل امن `gateway-secure` پورت 80 را منتشر می‌کند و Admin را غیرفعال نگه می‌دارد.
- مستندات: `systemupdate-web/docs/TEST_GUIDE.md`, `REAL_TESTS_PREP.md`, `VPS_AND_DOMAIN_SETUP.md`

### Links

- `systemupdate-web/docs/TEST_GUIDE.md`
- `systemupdate-web/docs/REAL_TESTS_PREP.md`
- `systemupdate-web/docs/VPS_AND_DOMAIN_SETUP.md`
- `systemupdate-web/docs/ALERTING.md`
- `systemupdate-web/docs/WINDOWS_SETUP.md`

---

## 18) شکاف‌ها و گام‌های بعدی (Gaps & Next Actions)

- Backend
  - [ ] پیاده‌سازی `command-service` (create/dispatch/track)، الگوی Outbox — باقی‌مانده
  - [ ] `data-ingest-service` (HTTP/WS/gRPC ingest) + مسیر به Kafka/Storage — باقی‌مانده
  - [ ] `analytics-service` (stream/batch حداقلی) + شاخص‌ها/گزارش‌های اولیه — باقی‌مانده
  - [ ] `notification-service` (Email/Webhook) + throttling — باقی‌مانده
  - [ ] API Gateway (Kong/Envoy) با authn/z، rate-limit، WAF — باقی‌مانده
- Data/Infra
  - [x] اضافه‌کردن PostgreSQL/Redis/Kafka به Compose و سپس Helm/K8s charts (deployments/) — تکمیل شده
  - [x] Schema Registry و قرارداد رویدادها (Avro/Protobuf) + ورژن‌دهی — تکمیل شده
  - [x] Observability کامل (OTel collector + Prometheus + Grafana + Tempo) — تکمیل شده
- Security
  - [ ] Keycloak/Auth0 ادغام OIDC واقعی + جریان JWT/JWKS در سرویس‌ها — باقی‌مانده
  - [ ] OPA/OPAL Policy-as-Code + تصمیم‌نگاری مرکزی — باقی‌مانده
  - [ ] Audit Trail غیرقابل‌تغییر و گزارش‌های امنیتی — باقی‌مانده
- Frontend
  - [ ] اسکلت React/TS + MUI + RTK Query + WS client — باقی‌مانده
  - [ ] صفحات اولیه: Dashboard/Devices/DeviceDetails/Commands/Analytics — باقی‌مانده
- Testing
  - [ ] جایگزینی تدریجی تست‌های واقعی (contract/integration) به‌جای placeholders — باقی‌مانده
  - [ ] Testcontainers برای DB/Redis/Kafka در CI — باقی‌مانده
  - [ ] E2E (Playwright) برای Web + WS flows — باقی‌مانده
- CI/CD و کیفیت
  - [x] اضافه‌کردن Python lint (ruff) و TS lint/format (eslint/prettier) — تکمیل شده
  - [ ] سفت‌کردن Trivy با policy‌های ignore کنترل‌شده و آستانه شکست مستند — باقی‌مانده
  - [ ] SBOM signing (Cosign) و انتشار artifactها — باقی‌مانده

ترتیب پیشنهادی اجرا (M0→M1):

1) تکمیل CI lintها (ruff/eslint) و پایدارسازی تست‌های سبُک
2) افزودن Postgres/Redis به Compose و health checks
3) شروع `command-service` + Outbox + قرارداد رویدادها
4) اسکلت Frontend و اتصال به auth/device/ws-hub
5) آماده‌سازی VPS برای تست‌های واقعی (زمان مناسب)

## 19) قرارداد Android ↔ Web (HTTP/WS)

این بخش قراردادهای حداقلی بین کلاینت اندروید و سرویس‌های وب را تعریف می‌کند. تمام مسیرهای HTTP از طریق Gateway با پیشوند `/api/*` در دسترس هستند. احراز هویت با JWT (Bearer) انجام می‌شود؛ در WS نیز توکن در هدر Authorization ارسال می‌گردد.

### 19.1) سرتیترها و احراز هویت (Headers & Auth)
- الزامی: `Authorization: Bearer <JWT>` (امضاشده توسط Keycloak؛ JWKS در Gateway)
- الزامی: `Content-Type: application/json`
- رهگیری: `X-Request-ID` (اختیاری اما توصیه‌شده؛ اگر ارسال نشود، Gateway مقداردهی می‌کند)

### 19.2) قالب خطا (Standard Error JSON)
```json
{
  "error": {
    "code": "<string>",
    "message": "<human_readable>",
    "details": { "field": "reason" },
    "request_id": "<uuid>"
  }
}
```

### 19.3) ثبت دستگاه (Device Registration)
- روش: POST `/api/devices/register`
- درخواست نمونه:
```json
{
  "device_id": "a1b2c3",
  "model": "Pixel 7",
  "os_version": "14",
  "capabilities": {"ws": true, "file_upload": true},
  "meta": {"locale": "fa-IR"}
}
```
- پاسخ 201:
```json
{ "status": "registered", "device_id": "a1b2c3" }
```

### 19.4) هارت‌بیت (Heartbeat)
- روش: POST `/api/devices/{id}/heartbeat`
- درخواست نمونه:
```json
{
  "ts": "2025-08-20T21:42:13Z",
  "battery": 0.87,
  "network": "wifi",
  "metrics": {"cpu": 0.12, "mem": 0.34}
}
```
- پاسخ 200:
```json
{ "status": "ok" }
```

### 19.5) دریافت دستورات (Command Fetch)
- روش: GET `/api/commands/pending?device_id={id}`
- پاسخ 200:
```json
{
  "commands": [
    {"id": "cmd-123", "kind": "shell", "args": ["ls", "/sdcard"], "ttl": 120},
    {"id": "cmd-124", "kind": "ping", "args": [], "ttl": 30}
  ]
}
```

### 19.6) تایید دریافت/اجرا (Command Acknowledgment)
- روش: PUT `/api/commands/{id}/ack`
- درخواست نمونه:
```json
{
  "device_id": "a1b2c3",
  "status": "succeeded",
  "output": "<truncated logs>",
  "error": null
}
```
- پاسخ 200:
```json
{ "ack": true }
```

### 19.7) بارگذاری داده (Data Upload)
- روش: POST `/api/data-ingest/upload`
- درخواست نمونه:
```json
{
  "device_id": "a1b2c3",
  "kind": "file",
  "name": "report.txt",
  "content_base64": "<BASE64>",
  "meta": {"mime": "text/plain"}
}
```
- پاسخ 202:
```json
{ "accepted": true, "ref": "up-789" }
```

### 19.8) قرارداد WebSocket (WS Hub)
- URL: `wss://gateway/ws/devices` (در توسعه: `ws://localhost:8000/ws/devices`)
- احراز هویت: هدر `Authorization: Bearer <JWT>`
- Ping/Pong: کلاینت هر 30 ثانیه Ping ارسال کند؛ سرور Pong پاسخ می‌دهد. قطع ارتباط > 60 ثانیه → reconnect با backoff نمایی (1s, 2s, 4s, حداکثر 30s).
- پیام نمونه (از سرور → کلاینت):
```json
{ "type": "command", "id": "cmd-125", "kind": "shell", "args": ["id"] }
```
- پیام نمونه (از کلاینت → سرور):
```json
{ "type": "ack", "id": "cmd-125", "status": "received" }
```

توضیحات:
- همه مسیرها نسخه‌دار می‌شوند در فازهای بعد (`/api/v1/...`).
- نرخ‌سنجی (Rate Limit) در Gateway روی مسیرهای `commands` و `upload` قابل اعمال است.
