# WS Hub Service

## Overview
WebSocket hub for bidirectional communication and heartbeats.

## Quick Start
```bash
cd services/ws-hub
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8006
```

## Configuration
See `app/config.py`.

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Name of service | `ws-hub` |
| `HEARTBEAT_INTERVAL_SEC` | Ping interval | `15` |

## API Documentation
- Swagger UI: http://localhost:8006/docs
- ReDoc: http://localhost:8006/redoc

## Testing
```bash
pytest tests/ -v
```

## Deployment
Docker Compose orchestrated. See `/docker-compose.yml`.
