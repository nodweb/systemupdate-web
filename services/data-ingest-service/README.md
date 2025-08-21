# Data Ingest Service

## Overview
Receives device data via HTTP and WebSocket and optionally forwards to Kafka.

## Quick Start
```bash
cd services/data-ingest-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8007
```

## Configuration
See `app/config.py`.

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Name of service | `data-ingest-service` |
| `KAFKA_BOOTSTRAP` | Kafka bootstrap servers | `kafka:9092` |
| `INGEST_TOPIC` | Kafka topic | `device.ingest.raw` |
| `INGEST_ALLOWED_KINDS` | Optional comma-separated allowed kinds | `None` |
| `INGEST_MAX_BYTES` | Max payload size | `524288` |
| `AUTH_REQUIRED` | Require auth for ingest | `false` |

## API Documentation
- Swagger UI: http://localhost:8007/docs
- ReDoc: http://localhost:8007/redoc

## Testing
```bash
pytest tests/ -v
```

## Deployment
Docker Compose orchestrated. See `/docker-compose.yml`.
