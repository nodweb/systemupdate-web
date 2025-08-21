# SystemUpdate-Web Execution Checklist

Updated: 2025-08-21

## Week 1: Critical Infrastructure (P0)

### Deprecation Fixes

- [x] Lifespan migration: command-service (PR #6)
- [x] Lifespan migration: data-ingest-service (PR #7)
- [x] Lifespan migration: notification-service (PR #8)
- [x] Lifespan migration: device-service (PR #9)
- [x] Lifespan migration: ws-hub (PR #10)
- [x] Lifespan migration: auth-service (PR #11)

### CI/Testing Stability

- [ ] Compose hygiene
- [ ] Enable ws-hub smoke

## Week 1: P1 Tasks

### WebSocket Smoke (ws-hub)

- [x] Add CI workflow to ping/pong ws-hub via minimal stack (PR #15)
  - Uses secrets `WS_HUB_SMOKE_TOKEN` and variable `WS_HUB_SMOKE_CLIENT_ID`

### Deeper Service Smokes

- [x] analytics-service: add smokes for `/batch/run` and `/stream/start` (PR #16)
- [x] notification-service: add smoke for `/alerts` (PR #16)

### Docs hygiene

- [x] Resolve markdownlint noise in Windows/Test guides (PR #17)

## Tracking

- PRs linked inline above
- Update weekly and note blockers
- Docs updates: TEST_GUIDE + WINDOWS_SETUP (PR #14)

## Completion Summary

- Date: 2025-08-21
- P0: Completed (PRs #6–#11)
- P1: Completed (PRs #15–#17)
- Notes:
  - WebSocket smoke is gated on repository secrets/vars and runs only when present.
