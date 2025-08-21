"""
Structured logging for the application.

This module provides a structured logging setup with request context support.

Example usage:

    from app.logging import get_logger
    
    logger = get_logger(__name__)
    
    # Basic logging
    logger.info("This is an info message")
    
    # Logging with context
    logger.info("Processing request", extra={"user_id": 123, "action": "login"})
    
    # Logging exceptions
    try:
        1 / 0
    except Exception as e:
        logger.exception("An error occurred")
"""
from app.logging_config import setup_logging, get_logger as _get_logger
from app.config.logging import logging_config

# Set up logging when the module is imported
setup_logging(
    log_level=logging_config.LOG_LEVEL,
    log_file=logging_config.LOG_FILE,
    log_format=logging_config.LOG_FORMAT,
    log_rotate=logging_config.LOG_ROTATE,
)

def get_logger(name: str = None):
    """
    Get a logger instance with the given name.
    
    Args:
        name: The name of the logger. If None, the root logger is returned.
        
    Returns:
        A logger instance configured with the application's logging settings.
    """
    return _get_logger(name)

# Re-export for convenience
from app.utils.logger import (
    log_request,
    log_response,
    log_exception,
    log_dependency,
)

from app.handlers.exception_handler import (
    APIError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    create_error_response,
    register_exception_handlers,
)
