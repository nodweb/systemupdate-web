"""
Shared health check utilities for all services.
"""
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field


class HealthCheckResult(BaseModel):
    """Result of a single health check."""
    status: str  # 'ok', 'warning', 'error'
    component: str
    details: Optional[Dict[str, Any]] = None
    time: float  # seconds


class HealthResponse(BaseModel):
    """Standard health check response."""
    status: str  # 'ok', 'warning', 'error'
    version: str
    timestamp: str
    checks: List[HealthCheckResult] = Field(default_factory=list)

    def add_check(
        self, status: str, component: str, details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add a health check result."""
        self.checks.append(
            HealthCheckResult(
                status=status, component=component, details=details, time=time.time()
            )
        )
        # Update overall status if this check is worse
        status_priority = {"error": 2, "warning": 1, "ok": 0}
        if status_priority[status] > status_priority.get(self.status, -1):
            self.status = status


class HealthChecker:
    """Health check registry and runner."""

    def __init__(self, service_name: str, version: str):
        self.service_name = service_name
        self.version = version
        self.checks = []

    def register_check(self, name: str, func=None):
        """Register a health check function.

        Supports both direct call and decorator styles:
        - direct: register_check("db", async_func)
        - decorator: @register_check("db")\n  async def async_func(): ...
        """
        if func is None:
            def _decorator(f):
                self.checks.append((name, f))
                return f
            return _decorator
        self.checks.append((name, func))
        return func

    # Backwards-compatible alias used by some services
    def add_check(self, name: str, func):
        return self.register_check(name, func)

    async def run_checks(self) -> HealthResponse:
        """Run all registered health checks."""
        response = HealthResponse(
            status="ok",
            version=self.version,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

        for name, check_func in self.checks:
            start_time = time.time()
            try:
                result = await check_func()
                response.add_check("ok", name, result)
            except Exception as e:
                response.add_check(
                    "error",
                    name,
                    {"error": str(e), "type": type(e).__name__},
                )

        return response


def setup_health_endpoints(app: FastAPI, health_checker: HealthChecker):
    """Add standard health check endpoints to a FastAPI app."""

    @app.get(
        "/healthz",
        response_model=HealthResponse,
        tags=["health"],
        summary="Health check endpoint",
        description="Returns the health status of the service and its dependencies.",
    )
    async def healthz() -> HealthResponse:
        return await health_checker.run_checks()

    @app.get(
        "/readyz",
        response_model=HealthResponse,
        tags=["health"],
        summary="Readiness check endpoint",
        description="Returns whether the service is ready to handle requests.",
    )
    async def readyz() -> HealthResponse:
        response = await health_checker.run_checks()
        # Only return 200 if all checks passed
        if any(check.status != "ok" for check in response.checks):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=response.dict()
            )
        return response

    @app.get(
        "/version",
        response_model=Dict[str, str],
        tags=["health"],
        summary="Version information",
        description="Returns the service version information.",
    )
    async def version() -> Dict[str, str]:
        return {"service": health_checker.service_name, "version": health_checker.version}
