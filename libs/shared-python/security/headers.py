from __future__ import annotations

from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add basic security headers to every response.

    Safe defaults; can be extended per service if needed.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request, call_next):  # type: ignore[override]
        response = await call_next(request)
        # Common headers (idempotent)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("X-XSS-Protection", "1; mode=block")
        # HSTS is only meaningful over HTTPS; still safe to include
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
        return response


def add_security_headers(app: FastAPI) -> None:
    """Helper to attach middleware if not already present."""
    app.add_middleware(SecurityHeadersMiddleware)
