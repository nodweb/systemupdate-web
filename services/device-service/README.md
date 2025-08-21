# Device Service

## Overview
Manages devices, presence, and metadata.

## Quick Start
```bash
cd services/device-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```

## Configuration
See `app/config.py`.

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Name of service | `device-service` |
| `AUTH_REQUIRED` | Require authentication | `false` |
| `AUTHZ_REQUIRED` | Require authorization checks | `false` |
| `AUTH_INTROSPECT_URL` | Auth introspection URL | `http://auth-service:8001/api/auth/introspect` |
| `AUTH_AUTHORIZE_URL` | AuthZ URL | `http://auth-service:8001/api/auth/authorize` |

## API Documentation
- Swagger UI: http://localhost:8005/docs
- ReDoc: http://localhost:8005/redoc

## Testing
```bash
pytest tests/ -v
```

## Deployment
Docker Compose orchestrated. See `/docker-compose.yml`.
