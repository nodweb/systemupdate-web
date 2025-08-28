# Troubleshooting

- Backend unhealthy: `docker compose logs backend --tail=100`
- DB/Redis connectivity: check env URLs, container networks
- WebSocket not connecting: validate VITE_WS_URL and CORS
- Android pinning fails: verify `PIN1/PIN2` sha256 pins, host names
