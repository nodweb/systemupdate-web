import logging
import os
from typing import Optional

_ENV = os.getenv("ENVIRONMENT", "development")


def get_correlation_id() -> Optional[str]:
    # Placeholder; can be integrated with contextvars/request middleware later
    return None


def get_structured_logger(service_name: str) -> logging.Logger:
    """Return a logger with a context filter for structured fields.

    Avoids altering global handlers to play nicely with service-level configs.
    """
    logger = logging.getLogger(service_name)

    class ContextFilter(logging.Filter):
        def filter(self, record: logging.LogRecord) -> bool:  # type: ignore[override]
            setattr(record, "service", service_name)
            setattr(record, "environment", _ENV)
            setattr(record, "correlation_id", get_correlation_id())
            return True

    # Ensure we don't add the filter multiple times
    if not any(isinstance(f, ContextFilter) for f in logger.filters):
        logger.addFilter(ContextFilter())
    return logger
