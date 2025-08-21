# Notification Service

## Overview
Microservice responsible for notifications and alert handling.

## Quick Start
```bash
cd services/notification-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8004
```

## Configuration
See `app/config.py` for settings. In-memory throttling controls are exposed via settings.

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Name of service | `notification-service` |
| `NOTIF_WORKER_ENABLED` | Enable background worker | `true` |
| `NOTIF_THROTTLE_WINDOW_SECONDS` | Sliding window size | `60` |
| `NOTIF_THROTTLE_LIMIT` | Max alerts per window | `20` |

## API Documentation
- Swagger UI: http://localhost:8004/docs
- ReDoc: http://localhost:8004/redoc

## Testing
```bash
pytest tests/ -v
```

## Deployment
Docker Compose orchestrated. See `/docker-compose.yml`.
