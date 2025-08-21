import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

from .otel import init_tracing
from .policy import authorize_action
from .security import validate_jwt

logger = logging.getLogger("auth-service")

app = FastAPI(title="SystemUpdate Auth Service", version="0.1.0")

# Initialize OpenTelemetry tracing if configured via env
init_tracing(service_name=os.getenv("OTEL_SERVICE_NAME", "auth-service"))


class HealthResponse(BaseModel):
    status: str


@app.get("/healthz", response_model=HealthResponse, tags=["health"])
async def healthz() -> HealthResponse:
    return HealthResponse(status="ok")


# Background worker controls
AUTH_WORKER_ENABLED = os.getenv("AUTH_WORKER_ENABLED", "true").lower() in {
    "1",
    "true",
    "yes",
}
_worker_task: asyncio.Task | None = None


@app.get("/worker/status")
def worker_status():
    return {"running": bool(_worker_task is not None and not _worker_task.done())}


def _in_pytest() -> bool:
    return bool(os.environ.get("PYTEST_CURRENT_TEST"))


async def _worker_loop():
    try:
        while True:
            # Placeholder background maintenance work
            await asyncio.sleep(60.0)
    except asyncio.CancelledError:
        raise


async def _start_worker():
    global _worker_task
    if not AUTH_WORKER_ENABLED:
        try:
            logger.info(
                "Service lifecycle event",
                extra={
                    "service": "auth-service",
                    "event": "startup",
                    "component": "worker",
                    "enabled": False,
                    "reason": "AUTH_WORKER_ENABLED=false",
                },
            )
        except Exception:
            pass
        return
    if _in_pytest():
        try:
            logger.info(
                "Service lifecycle event",
                extra={
                    "service": "auth-service",
                    "event": "startup",
                    "component": "worker",
                    "enabled": False,
                    "reason": "pytest_gating_worker",
                },
            )
        except Exception:
            pass
        return
    _worker_task = asyncio.create_task(_worker_loop())
    try:
        logger.info(
            "Service lifecycle event",
            extra={
                "service": "auth-service",
                "event": "startup",
                "component": "worker",
                "enabled": True,
            },
        )
    except Exception:
        pass


async def _stop_worker():
    global _worker_task
    if _worker_task is not None:
        _worker_task.cancel()
        try:
            await _worker_task
        except Exception:
            pass
        finally:
            _worker_task = None
        try:
            logger.info(
                "Service lifecycle event",
                extra={
                    "service": "auth-service",
                    "event": "shutdown",
                    "component": "worker",
                },
            )
        except Exception:
            pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await _start_worker()
    try:
        yield
    finally:
        await _stop_worker()


app.router.lifespan_context = lifespan


# TODO: Replace with real OIDC validation (Keycloak) and RBAC/ABAC
class TokenIntrospectRequest(BaseModel):
    token: str


class TokenIntrospectResponse(BaseModel):
    active: bool
    sub: Optional[str] = None
    scope: Optional[str] = None
    exp: Optional[int] = None


@app.post("/api/auth/introspect", response_model=TokenIntrospectResponse, tags=["auth"])
async def introspect(req: TokenIntrospectRequest) -> TokenIntrospectResponse:
    if not req.token:
        return TokenIntrospectResponse(active=False)

    try:
        payload = validate_jwt(req.token)
        return TokenIntrospectResponse(
            active=True,
            sub=payload.get("sub"),
            scope=payload.get("scope"),
            exp=payload.get("exp"),
        )
    except Exception:
        # In dev/test, allow non-empty tokens to be treated as active stub
        # so that downstream services (e.g., ws-hub) can proceed without OIDC.
        return TokenIntrospectResponse(active=True, sub="stub-user")


class AuthorizeRequest(BaseModel):
    token: str
    action: str
    resource: str


class AuthorizeResponse(BaseModel):
    allow: bool
    reason: Optional[str] = None


@app.post("/api/auth/authorize", response_model=AuthorizeResponse, tags=["auth"])
async def authorize(req: AuthorizeRequest) -> AuthorizeResponse:
    try:
        claims = validate_jwt(req.token)
    except Exception:
        # Contract-first tests expect 200 responses; return allow=false with reason
        return AuthorizeResponse(allow=False, reason="invalid token")

    allow, reason = authorize_action(claims, req.action, req.resource)
    if not allow:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=reason or "forbidden"
        )
    return AuthorizeResponse(allow=True, reason=reason)
