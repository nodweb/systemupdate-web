# Production Deployment Guide - SystemUpdate

## Prerequisites
- Docker 20.10+
- Docker Compose v2+
- PostgreSQL 14/15
- Redis 6/7
- Domain, SSL certificates (or reverse proxy with Let's Encrypt)

## Environment
1. Copy env and set strong values
```
cp .env.example .env
# Set SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL, REDIS_URL, VITE_* to your env
```
2. Ensure ports 5000 (backend) and 3000 (frontend) are available

## Build & Run
```
docker compose build
docker compose up -d
```

## Post-deploy
- Health: GET http(s)://<host>:5000/health should return {"status":"ok"}
- Frontend: http(s)://<host>:3000
- WebSocket: Dashboard badge "WS Connected"

## Migrations (if using Flask-Migrate)
```
docker compose run --rm backend flask db upgrade
```

## Reverse Proxy (example: Nginx)
- Proxy / to frontend container:3000
- Proxy /api and WS upgrades to backend:5000
- Pass headers: Upgrade, Connection, X-Forwarded-*

## Security
- Use HTTPS for all traffic
- Rotate JWT secrets regularly
- Restrict CORS to your frontend domains
- Store secrets in a safe secret manager

## Monitoring
- Container health via `docker compose ps` and logs via `docker compose logs`
- Add Prometheus/Grafana as needed
