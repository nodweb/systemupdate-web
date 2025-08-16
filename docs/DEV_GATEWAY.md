# Dev Gateway and Proxy

This repo supports two ways to route frontend → backend during development:

- Traefik (Compose) as API gateway under `/api/*`
- Vite dev server proxy for local frontend-only runs

## Traefik (docker-compose)

- Compose starts Traefik and services; Traefik routes:
  - `/api/command` → command-service (8004)
  - `/api/ingest` → data-ingest-service (8005)
  - `/api/analytics` → analytics-service (8006)
- Dynamic rules are in `traefik/dynamic/` (see sample routers/services).

Example curl (with Compose running):

```bash
curl -s http://localhost:8080/api/command/healthz
curl -s http://localhost:8080/api/command/example/commands
curl -s http://localhost:8080/api/ingest/healthz
curl -s http://localhost:8080/api/analytics/healthz
```

Notes:
- Adjust Traefik entrypoint/ports as set in `docker-compose.yml`.
- For websockets, configure appropriate Traefik middlewares if needed.

## Vite dev proxy

- When running `npm run dev` (Vite), `/api/*` is proxied to backend to avoid CORS.
- See `frontend/vite.config.ts` for proxy settings. Default example forwards to command-service on `localhost:8004`.

Example fetch in frontend:

```ts
// baseQuery('/api') in RTK Query
fetch('/api/command/example/commands')
```

## Choosing an approach

- Use Traefik when developing multiple services via Compose, keeping routes consistent with CI/deploy.
- Use Vite proxy for quick frontend iteration without Compose.

## Troubleshooting

- CORS errors: ensure you are hitting `/api/*` and proxy is configured.
- 404s via Traefik: verify dynamic config under `traefik/dynamic/*.yml` and service ports.
- Windows: consider WSL2 for Docker engine stability; see `docs/WINDOWS_SETUP.md`.
