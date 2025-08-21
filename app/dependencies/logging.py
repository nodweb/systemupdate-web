"""
Dependencies for request logging and context management.
"""
from typing import Generator, Dict, Any, Optional

from fastapi import Depends, Request
from starlette.requests import Request as StarletteRequest

from app.utils.logger import get_logger, request_context, log_request, log_response

async def get_request_context(request: Request) -> Dict[str, Any]:
    """
    Get or create request context for logging.
    
    This dependency creates a new context for each request with common fields
    that will be included in all log messages.
    """
    # Create a new context for this request
    context = {
        'request_id': request.headers.get('X-Request-ID', str(request.scope.get('request_id', ''))),
        'ip': request.client.host if request.client else None,
        'user_agent': request.headers.get('user-agent'),
        'endpoint': f"{request.method} {request.url.path}",
    }
    
    # Set the context for this request
    token = request_context.set(context)
    
    # Log the incoming request
    log_request(request)
    
    # The context will be available for the duration of the request
    try:
        yield context
    finally:
        # Clean up the context when the request is done
        request_context.reset(token)


def get_logger_dependency():
    """
    Dependency that provides a logger instance with request context.
    
    This should be used in route handlers to get a logger that automatically
    includes request context in all log messages.
    """
    def _get_logger(
        request: StarletteRequest = Depends(get_request_context)
    ):
        return get_logger()
    
    return _get_logger


# Common dependency for route handlers that need logging
LoggerDep = Depends(get_logger_dependency())
