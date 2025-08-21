import time
import uuid
from typing import Callable, Awaitable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from app.logging_config import get_logger

logger = get_logger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging HTTP requests and responses with structured data.
    """
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Generate request ID if not present
        request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        
        # Add request ID to request state
        request.state.request_id = request_id
        
        # Log request
        start_time = time.time()
        
        logger.info(
            "Request started",
            extra={
                'request_id': request_id,
                'method': request.method,
                'url': str(request.url),
                'client': request.client.host if request.client else None,
                'user_agent': request.headers.get('user-agent'),
            },
        )
        
        # Process request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                "Request completed",
                extra={
                    'request_id': request_id,
                    'status_code': response.status_code,
                    'process_time': f"{process_time:.4f}s",
                    'response_size': int(response.headers.get('content-length', 0)),
                },
            )
            
            # Add request time header
            response.headers["X-Process-Time"] = f"{process_time:.4f}"
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                "Request failed",
                extra={
                    'request_id': request_id,
                    'process_time': f"{process_time:.4f}s",
                    'error': str(e),
                    'error_type': e.__class__.__name__,
                },
                exc_info=True,
            )
            raise
        
        return response

def setup_logging_middleware(app: ASGIApp) -> ASGIApp:
    """
    Add request logging middleware to the FastAPI application.
    
    Args:
        app: FastAPI application instance
        
    Returns:
        ASGI application with logging middleware
    """
    return RequestLoggingMiddleware(app)
