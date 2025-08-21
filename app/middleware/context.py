"""
Request context middleware for logging and tracing.
"""
import time
import uuid
from typing import Callable, Awaitable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

import os
from app.utils.logger import get_logger, request_context

logger = get_logger(__name__)

class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add request context to logs.
    
    This middleware adds a unique request ID to each request and sets up a context
    that will be available in all logs during the request lifecycle.
    """
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Generate or get request ID
        request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        
        # Get client IP
        if request.client:
            client_ip = request.client.host
            if x_forwarded_for := request.headers.get('X-Forwarded-For'):
                client_ip = x_forwarded_for.split(',')[0].strip()
        else:
            client_ip = None
        
        # Create request context
        context = {
            'request_id': request_id,
            'method': request.method,
            'path': request.url.path,
            'client_ip': client_ip,
            'user_agent': request.headers.get('user-agent'),
            'start_time': time.time(),
        }
        
        # Add user info if available
        if hasattr(request.state, 'user'):
            context['user'] = {
                'id': getattr(request.state.user, 'id', None),
                'email': getattr(request.state.user, 'email', None),
                'roles': getattr(request.state.user, 'roles', []),
            }
        
        # Set the context for this request
        token = request_context.set(context)
        
        # Log the request
        log_requests = os.getenv('LOG_REQUESTS', 'true').lower() not in ('0', 'false', 'no')
        if log_requests:
            logger.info(
                "Request started",
                extra={
                    'http': {
                        'method': request.method,
                        'url': str(request.url),
                        'headers': dict(request.headers),
                        'query_params': dict(request.query_params),
                    },
                    'client': {
                        'ip': client_ip,
                        'user_agent': request.headers.get('user-agent'),
                    },
                },
            )
        
        # Process the request
        try:
            response = await call_next(request)
            process_time = time.time() - context['start_time']
            
            # Log the response
            if log_requests:
                logger.info(
                    "Request completed",
                    extra={
                        'http': {
                            'status_code': response.status_code,
                            'process_time': f"{process_time:.4f}s",
                            'response_size': int(response.headers.get('content-length', 0)),
                        },
                    },
                )
            
            # Add headers
            response.headers['X-Request-ID'] = request_id
            response.headers['X-Process-Time'] = f"{process_time:.4f}"
            
            return response
            
        except Exception as exc:
            process_time = time.time() - context['start_time']
            
            # Log the error
            logger.error(
                f"Request failed: {str(exc)}",
                extra={
                    'error': {
                        'type': exc.__class__.__name__,
                        'message': str(exc),
                        'traceback': True,
                    },
                    'http': {
                        'process_time': f"{process_time:.4f}s",
                    },
                },
                exc_info=True,
            )
            
            # Re-raise the exception to be handled by the exception handlers
            raise
            
        finally:
            # Clean up the context
            request_context.reset(token)


def setup_request_context_middleware(app: ASGIApp) -> ASGIApp:
    """
    Add request context middleware to the FastAPI application.
    
    Args:
        app: FastAPI application instance
        
    Returns:
        ASGI application with request context middleware
    """
    return RequestContextMiddleware(app)
