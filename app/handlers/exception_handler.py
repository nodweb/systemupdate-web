"""
Exception handlers for the application.
"""
import traceback
from typing import Any, Callable, Dict, Optional, Type, Union

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

import os
from app.utils.logger import get_logger, log_exception

logger = get_logger(__name__)

class APIError(Exception):
    """Base exception for API errors."""
    
    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        message: str = "An unexpected error occurred",
        error_code: Optional[str] = None,
        details: Any = None,
    ):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code or f"ERR_{status_code}"
        self.details = details
        super().__init__(message)


class ValidationError(APIError):
    """Raised when request validation fails."""
    
    def __init__(
        self,
        message: str = "Validation error",
        details: Any = None,
    ):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class NotFoundError(APIError):
    """Raised when a resource is not found."""
    
    def __init__(
        self,
        resource: str = "Resource",
        resource_id: Any = None,
        message: Optional[str] = None,
    ):
        if message is None:
            message = f"{resource} not found"
            if resource_id is not None:
                message += f" with id {resource_id}"
        
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            error_code="NOT_FOUND",
            details={"resource": resource, "id": resource_id},
        )


class UnauthorizedError(APIError):
    """Raised when authentication fails or user is not authorized."""
    
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            error_code="UNAUTHORIZED",
        )


class ForbiddenError(APIError):
    """Raised when user doesn't have permission to access a resource."""
    
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            error_code="FORBIDDEN",
        )


def create_error_response(
    status_code: int,
    message: str,
    error_code: Optional[str] = None,
    details: Any = None,
) -> Dict[str, Any]:
    """
    Create a standardized error response.
    
    Args:
        status_code: HTTP status code
        message: Error message
        error_code: Application-specific error code
        details: Additional error details
        
    Returns:
        Dict containing the error response
    """
    error_code = error_code or f"ERR_{status_code}"
    
    response = {
        "error": {
            "code": error_code,
            "message": message,
        }
    }
    
    if details is not None:
        response["error"]["details"] = details
    
    return response


def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions."""
    logger.warning(
        f"HTTP {exc.status_code} {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "detail": exc.detail,
            "headers": dict(exc.headers) if getattr(exc, "headers", None) else None,
        },
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            status_code=exc.status_code,
            message=str(exc.detail),
        ),
        headers=dict(exc.headers) if getattr(exc, "headers", None) else None,
    )


def validation_exception_handler(
    request: Request, 
    exc: Union[RequestValidationError, PydanticValidationError]
) -> JSONResponse:
    """Handle request validation errors."""
    errors = exc.errors() if hasattr(exc, "errors") else exc.details
    
    logger.warning(
        "Request validation failed",
        extra={
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "errors": errors,
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=create_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Validation error",
            error_code="VALIDATION_ERROR",
            details=errors,
        ),
    )


def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle API errors."""
    logger.warning(
        f"API error: {exc.message}",
        extra={
            "status_code": exc.status_code,
            "error_code": exc.error_code,
            "details": exc.details,
        },
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            status_code=exc.status_code,
            message=exc.message,
            error_code=exc.error_code,
            details=exc.details,
        ),
    )


def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unhandled exceptions."""
    # Log the full exception with traceback
    log_exception(request, exc)
    
    # In production, return a generic error message
    environment = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
    if environment == "production":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=create_error_response(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="Internal server error",
                error_code="INTERNAL_SERVER_ERROR",
            ),
        )
    
    # In development, include the full error details
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=str(exc),
            error_code="UNHANDLED_ERROR",
            details={
                "type": exc.__class__.__name__,
                "traceback": traceback.format_exc().splitlines(),
            },
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register exception handlers with the FastAPI app."""
    # Register handlers for different exception types
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(PydanticValidationError, validation_exception_handler)
    app.add_exception_handler(APIError, api_error_handler)
    
    # This should be the last handler as it catches all exceptions
    app.add_exception_handler(Exception, unhandled_exception_handler)
