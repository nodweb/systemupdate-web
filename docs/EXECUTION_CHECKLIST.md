# SystemUpdate-Web Execution Checklist

Updated: 2025-08-20
Progress: ~45% complete / ~55% remaining


## Week 1: Critical Infrastructure (P0)

### Deprecation Fixes

- [ ] Lifespan migration (8-12h)
  - [x] analytics-service (PR #5)
  - [ ] command-service
  - [ ] data-ingest-service
  - [ ] notification-service
  - [ ] device-service
  - [ ] ws-hub

- [ ] UTC time migration (2-3h)
  - [ ] app/logging_config.py
  - [ ] libs/shared_python/health/__init__.py


### CI/Testing Stability

- [ ] Compose hygiene (4-6h)
  - [ ] Remove Windows absolute paths
  - [ ] Add healthchecks for all services
  - [ ] Fix gateway service_healthy dependencies

- [ ] Enable ws-hub smoke (4h)
  - [ ] Set WS_HUB_SMOKE_TOKEN secret
  - [ ] Set WS_HUB_SMOKE_CLIENT_ID variable
  - [ ] Verify 101 upgrade + ping/pong


### Documentation

- [ ] Update TEST_GUIDE.md (2h)
  - [ ] PYTEST_CURRENT_TEST gating
  - [ ] Fallback import patterns

- [ ] Update WINDOWS_SETUP.md (1h)
  - [ ] Docker/WSL2 notes
  - [ ] Testcontainers setup


## Week 2: Security & Integration (P1)

### Gateway Security

- [ ] Keycloak JWKS integration (6h)
- [ ] Gateway JWT behind AUTH_REQUIRED flag
- [ ] jwks-service-smoke CI job


### Policy Engine

- [ ] OPA decision logs visibility (2h)
- [ ] OPAL GitHub sync setup (2h)
- [ ] Policy testing scenarios (4h)


### E2E Enhancement

- [ ] Second E2E scenario (3h)
- [ ] Performance baselines (2h)


## Week 3: Frontend & Polish (P2)

### Frontend Foundation

- [ ] Vite + React + TS scaffold (4h)
- [ ] Basic routing and layouts (4h)
- [ ] API client with gateway proxy (4h)


### Integration

- [ ] Wire frontend to APIs (4h)
- [ ] WebSocket client placeholder (2h)
- [ ] Basic auth flow UI (4h)


## Tracking


- Link PR numbers here as work progresses
- Update percentages weekly
- Note blockers immediately
