# Analytics Service

## Overview
Microservice responsible for analytics operations in the SystemUpdate platform.

## Quick Start
```bash
cd services/analytics-service
python -m venv venv
# Windows:
venv\Scripts\activate
# Unix:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

## Configuration
See `app/config.py` for all available settings. Settings derive from `libs/shared-python/config_base.py`.

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Name of service | `analytics-service` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `AUTH_REQUIRED` | Require authentication | `false` |
| `ENABLE_TRACING` | Enable OpenTelemetry tracing | `true` |

## API Documentation
- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

## Testing
```bash
pytest tests/ -v
pytest -m "not integration"
```

## Deployment
Service is containerized and deployed via Docker Compose. See `/docker-compose.yml`.
