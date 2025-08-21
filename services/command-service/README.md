# Command Service

## Overview
Publishes commands to devices and manages command lifecycle.

## Quick Start
```bash
cd services/command-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

## Configuration
See `app/config.py`.

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Name of service | `command-service` |
| `COMMAND_PUBLISH_ENABLED` | Enable background publisher | `true` |
| `COMMAND_TTL_SECONDS` | Command TTL | `3600` |
| `MAX_COMMAND_SIZE` | Max payload size | `1048576` |

## API Documentation
- Swagger UI: http://localhost:8003/docs
- ReDoc: http://localhost:8003/redoc

## Testing
```bash
pytest tests/ -v
```

## Deployment
Docker Compose orchestrated. See `/docker-compose.yml`.
