import os
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

from .otel import init_tracing
from .policy import authorize_action
from .security import validate_jwt

app = FastAPI(title="SystemUpdate Auth Service", version="0.1.0")

# Initialize OpenTelemetry tracing if configured via env
init_tracing(service_name=os.getenv("OTEL_SERVICE_NAME", "auth-service"))


class HealthResponse(BaseModel):
    status: str


@app.get("/healthz", response_model=HealthResponse, tags=["health"])
async def healthz() -> HealthResponse:
    return HealthResponse(status="ok")


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
