"""
Structured logging utilities for the application.
"""
import inspect
import logging
from contextvars import ContextVar
from typing import Any, Dict, Optional, Type, TypeVar, Callable, Awaitable, Union

from fastapi import Request, Response
from starlette.types import ASGIApp

from app.logging_config import get_logger as get_base_logger

# Context variable to store request-specific data
request_context: ContextVar[Dict[str, Any]] = ContextVar('request_context', default={})

class StructuredLogger:
    """
    A structured logger that adds context to log messages.
    """
    
    def __init__(self, name: str = None):
        """
        Initialize the structured logger.
        
        Args:
            name: Logger name (usually __name__)
        """
        if not name and inspect.isframe(inspect.currentframe()):
            # Get the name of the calling module
            frame = inspect.currentframe().f_back
            name = frame.f_globals.get('__name__') if frame else __name__
            
        self.logger = get_base_logger(name or self.__class__.__module__)
    
    def _get_extra(self, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Combine context and provided extra data.
        
        Args:
            extra: Additional context data
            
        Returns:
            Combined context dictionary
        """
        context = request_context.get().copy()
        if extra:
            context.update(extra)
        return context
    
    def debug(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs) -> None:
        """Log a debug message with structured data."""
        self.logger.debug(message, extra=self._get_extra(extra), **kwargs)
    
    def info(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs) -> None:
        """Log an info message with structured data."""
        self.logger.info(message, extra=self._get_extra(extra), **kwargs)
    
    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs) -> None:
        """Log a warning message with structured data."""
        self.logger.warning(message, extra=self._get_extra(extra), **kwargs)
    
    def error(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs) -> None:
        """Log an error message with structured data."""
        self.logger.error(message, extra=self._get_extra(extra), **kwargs)
    
    def exception(
        self, 
        message: str, 
        exc_info: bool = True, 
        extra: Optional[Dict[str, Any]] = None, 
        **kwargs
    ) -> None:
        """Log an exception with structured data."""
        self.logger.error(
            message, 
            exc_info=exc_info, 
            extra=self._get_extra(extra), 
            **kwargs
        )
    
    def critical(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs) -> None:
        """Log a critical message with structured data."""
        self.logger.critical(message, extra=self._get_extra(extra), **kwargs)


def get_logger(name: str = None) -> StructuredLogger:
    """
    Get a structured logger instance.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Configured StructuredLogger instance
    """
    return StructuredLogger(name)


def log_request(request: Request) -> None:
    """
    Log an HTTP request with structured data.
    
    Args:
        request: FastAPI Request object
    """
    logger = get_logger(__name__)
    
    extra = {
        'request': {
            'method': request.method,
            'url': str(request.url),
            'path': request.url.path,
            'query': dict(request.query_params),
            'client': request.client.host if request.client else None,
            'user_agent': request.headers.get('user-agent'),
        }
    }
    
    logger.info("Request received", extra=extra)


def log_response(
    request: Request, 
    response: Union[Dict, str, bytes], 
    status_code: int = 200,
    error: Exception = None
) -> None:
    """
    Log an HTTP response with structured data.
    
    Args:
        request: FastAPI Request object
        response: Response data
        status_code: HTTP status code
        error: Optional exception if the response is an error
    """
    logger = get_logger(__name__)
    
    # Prepare response data for logging
    response_data = response
    if isinstance(response, (bytes, bytearray)):
        response_data = "<binary data>"
    
    extra = {
        'request': {
            'method': request.method,
            'path': request.url.path,
            'query': dict(request.query_params),
        },
        'response': {
            'status_code': status_code,
            'data': response_data,
        },
    }
    
    if error:
        extra['error'] = {
            'type': error.__class__.__name__,
            'message': str(error),
        }
        logger.error("Request failed", extra=extra)
    else:
        logger.info("Request completed", extra=extra)


def log_exception(
    request: Request, 
    exc: Exception,
    status_code: int = 500,
    response: Optional[Dict] = None
) -> None:
    """
    Log an exception with request context.
    
    Args:
        request: FastAPI Request object
        exc: Exception that occurred
        status_code: HTTP status code
        response: Optional response data
    """
    logger = get_logger(__name__)
    
    extra = {
        'request': {
            'method': request.method,
            'path': request.url.path,
            'query': dict(request.query_params),
        },
        'error': {
            'type': exc.__class__.__name__,
            'message': str(exc),
            'traceback': True,
        },
        'response': response or {},
    }
    
    logger.exception(
        f"Unhandled exception: {str(exc)}",
        extra=extra,
    )


def log_dependency(
    dependency_name: str,
    duration: float,
    success: bool = True,
    error: Optional[Exception] = None,
    extra: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log a dependency call with timing and status.
    
    Args:
        dependency_name: Name of the dependency (e.g., 'database', 'redis')
        duration: Call duration in seconds
        success: Whether the call was successful
        error: Optional exception if the call failed
        extra: Additional context data
    """
    logger = get_logger(__name__)
    
    log_data = {
        'dependency': dependency_name,
        'duration': f"{duration:.4f}s",
        'success': success,
    }
    
    if extra:
        log_data.update(extra)
    
    if error:
        log_data['error'] = {
            'type': error.__class__.__name__,
            'message': str(error),
        }
        logger.error("Dependency call failed", extra=log_data)
    else:
        logger.debug("Dependency call completed", extra=log_data)
