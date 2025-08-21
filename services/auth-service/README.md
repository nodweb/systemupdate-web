# Auth Service

## Overview
Authentication and authorization endpoints (introspect, authorize) for the platform.

## Quick Start
```bash
cd services/auth-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Configuration
See `app/config.py`.

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Name of service | `auth-service` |

## API Documentation
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Testing
```bash
pytest tests/ -v
```

## Deployment
Docker Compose orchestrated. See `/docker-compose.yml`.
