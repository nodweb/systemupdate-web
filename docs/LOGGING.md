# Logging in SystemUpdate

This document describes the logging architecture and usage in the SystemUpdate application.

## Overview

The application uses structured logging with the following features:

- **Structured Logs**: Logs are emitted in JSON format by default, making them easy to parse and analyze.
- **Request Context**: Each request gets a unique request ID and context that's included in all log messages.
- **Correlation**: Logs can be correlated using the request ID across services.
- **Performance Monitoring**: Request processing times are automatically logged.
- **Error Tracking**: Exceptions are automatically captured with full stack traces.

## Configuration

Logging is configured via environment variables:

```bash
# Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Log format (json or text)
LOG_FORMAT=json

# Log file path (if not set, logs to console only)
LOG_FILE=logs/app.log

# Enable log rotation (true/false)
LOG_ROTATE=true

# Maximum log file size in bytes (for rotation)
LOG_MAX_SIZE=10485760  # 10MB

# Number of backup log files to keep
LOG_BACKUP_COUNT=5

# Enable JSON logging (true/false)
LOG_JSON=true

# Enable request/response logging (true/false)
LOG_REQUESTS=true

# Enable SQL query logging (true/false)
LOG_SQL_QUERIES=false

# Enable Kafka consumer logging (true/false)
LOG_KAFKA=true

# Enable WebSocket logging (true/false)
LOG_WEBSOCKET=true
```

## Usage

### Basic Logging

```python
from app.logging import get_logger

logger = get_logger(__name__)

logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
logger.critical("Critical message")

# With context
try:
    result = some_operation()
    logger.info("Operation completed", extra={"result": result, "user_id": 123})
except Exception as e:
    logger.exception("Operation failed", extra={"user_id": 123})
```

### Request Logging

Request logging is handled automatically by the middleware. Each request will have:

- A unique request ID
- Client IP address
- User agent
- Processing time
- Response status code

### Structured Logs

Example JSON log entry:

```json
{
  "timestamp": "2023-04-01T12:34:56.789Z",
  "level": "INFO",
  "service": "systemupdate-web",
  "environment": "development",
  "message": "Request completed",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "http": {
    "method": "GET",
    "path": "/api/status",
    "status_code": 200,
    "process_time": "0.1234s",
    "response_size": 42
  },
  "client": {
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  },
  "user": {
    "id": 123,
    "email": "user@example.com"
  }
}
```

## Error Handling

The application provides custom exception classes for common error scenarios:

```python
from app.logging import APIError, NotFoundError, UnauthorizedError, ForbiddenError

# Raise a not found error
raise NotFoundError(resource="User", resource_id=123)

# Raise a validation error
raise ValidationError("Invalid input", details={"field": "email", "error": "Invalid format"})

# Raise an unauthorized error
raise UnauthorizedError("Invalid credentials")

# Raise a forbidden error
raise ForbiddenError("Insufficient permissions")

# Custom API error
raise APIError(
    status_code=400,
    message="Invalid request",
    error_code="INVALID_REQUEST",
    details={"field": "email"}
)
```

## Best Practices

1. **Use Structured Logging**: Always include structured data in the `extra` parameter.
2. **Include Context**: Add relevant context like user ID, request ID, etc.
3. **Use Appropriate Log Levels**:
   - DEBUG: Detailed information for debugging
   - INFO: General operational information
   - WARNING: Indicates a potential issue
   - ERROR: An error occurred but the application can continue
   - CRITICAL: A serious error that may cause the application to crash
4. **Don't Log Sensitive Data**: Avoid logging passwords, API keys, or PII.
5. **Use Request ID**: Include the request ID in all log messages for correlation.

## Integration with Monitoring

Logs can be integrated with monitoring tools like:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **Datadog**
- **New Relic**
- **AWS CloudWatch**

## Performance Considerations

- Logging I/O can be expensive. Use appropriate log levels to control verbosity.
- Consider using async logging for high-throughput applications.
- Be mindful of log rotation and retention policies.

## Testing

To test logging in your tests:

```python
import logging
from io import StringIO
from contextlib import redirect_stdout

def test_logging():
    log_stream = StringIO()
    handler = logging.StreamHandler(log_stream)
    logger = logging.getLogger("app")
    logger.addHandler(handler)
    
    # Your test code that generates logs
    logger.info("Test message")
    
    # Assert logs were generated
    assert "Test message" in log_stream.getvalue()
```

## Troubleshooting

- **No Logs Appearing**: Check log level and handlers configuration.
- **Logs Not Rotating**: Verify file permissions and disk space.
- **Performance Issues**: Consider reducing log verbosity or using async logging.

## See Also

- [Python Logging Documentation](https://docs.python.org/3/library/logging.html)
- [Structured Logging in Python](https://www.structlog.org/en/stable/)
- [Logging Best Practices](https://www.loggly.com/use-cases/6-best-practices-for-structuring-logs/)

## Changelog

### [Unreleased]
- Initial implementation of structured logging
- Added request context middleware
- Added custom exception handling
- Added documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
