# Health Check API Documentation

This document describes the standardized health check endpoints implemented across all SystemUpdate services.

## Standard Endpoints

All services implement the following HTTP endpoints:

### `GET /healthz`
Returns the health status of the service.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-08-19T15:30:00Z",
  "checks": {
    "database": {
      "status": "ok",
      "message": "Database connection OK"
    },
    "kafka": {
      "status": "ok",
      "message": "Kafka connection OK"
    }
  }
}
```

### `GET /readyz`
Indicates whether the service is ready to accept traffic.

**Response:**
```json
{
  "status": "ok",
  "message": "Service is ready"
}
```

### `GET /version`
Returns the service version information.

**Response:**
```json
{
  "name": "auth-service",
  "version": "1.0.0",
  "build": "abc123",
  "build_time": "2025-08-19T10:00:00Z"
}
```

## Response Status Codes

- `200 OK`: The service is healthy and ready
- `503 Service Unavailable`: The service is not healthy

## Health Check Types

Each service implements relevant health checks based on its dependencies:

| Service | Health Checks |
|---------|---------------|
| auth-service | Database, Redis |
| device-service | Database |
| command-service | Database, Kafka |
| analytics-service | Database, Kafka |
| notification-service | Database |
| data-ingest-service | Kafka |
| ws-hub | WebSocket connections |

## Monitoring Setup

### Prometheus Configuration
```yaml
scrape_configs:
  - job_name: 'systemupdate-services'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['auth-service:8001', 'device-service:8002', 'command-service:8003']

  - job_name: 'systemupdate-service-health'
    metrics_path: '/healthz'
    static_configs:
      - targets: ['auth-service:8001', 'device-service:8002', 'command-service:8003']
    metrics_path: /healthz
    params:
      format: ['prometheus']
```

### Alerting Rules
```yaml
groups:
- name: systemupdate.rules
  rules:
  - alert: ServiceDown
    expr: up{job="systemupdate-services"} == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Service {{ $labels.instance }} is down"
      description: "{{ $labels.instance }} has been down for more than 5 minutes"

  - alert: ServiceUnhealthy
    expr: health_status{status!="ok"} == 1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Service {{ $labels.service }} is unhealthy"
      description: "{{ $labels.check }}: {{ $value }}"
```

## Troubleshooting

1. **Service is not responding to health checks**
   - Verify the service is running: `docker ps | grep <service>`
   - Check service logs: `docker logs <container_id>`
   - Verify network connectivity between services

2. **Database connection issues**
   - Verify database is running and accessible
   - Check connection string and credentials
   - Verify network connectivity to the database

3. **Kafka connection issues**
   - Verify Kafka brokers are running and accessible
   - Check Kafka broker addresses and ports
   - Verify network connectivity to Kafka

## Best Practices

1. **Health Check Frequency**
   - Check every 10-15 seconds in production
   - Use a 2-3 second timeout
   - Consider service load when setting check frequency

2. **Dependency Checks**
   - Only check critical dependencies
   - Cache results for non-critical checks
   - Use timeouts to prevent cascading failures

3. **Monitoring**
   - Set up alerts for unhealthy status
   - Monitor health check response times
   - Track historical health status
