from typing import Any, Dict, Optional

from fastapi import HTTPException


class ServiceError(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "details": details or {},
                }
            },
        )


class ValidationError(ServiceError):
    def __init__(self, message: str, details: Dict[str, Any]):
        super().__init__(400, "VALIDATION_ERROR", message, details)


class NotFoundError(ServiceError):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            404,
            "NOT_FOUND",
            f"{resource} not found",
            {"resource": resource, "id": identifier},
        )


class ConflictError(ServiceError):
    def __init__(self, message: str, details: Dict[str, Any]):
        super().__init__(409, "CONFLICT", message, details)


class InternalError(ServiceError):
    def __init__(self, message: str = "Internal server error"):
        super().__init__(500, "INTERNAL_ERROR", message)
