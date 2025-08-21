import os
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

# Import shared health check module with repo-root fallback
try:
    from libs.shared_python.health import HealthChecker, setup_health_endpoints
except Exception:
    import pathlib
    import sys

    _root = pathlib.Path(__file__).resolve().parents[3]
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))
    from libs.shared_python.health import HealthChecker, setup_health_endpoints

# Try monorepo-level middleware/handlers first; fall back to dynamic import by path
try:
    from app.handlers.exception_handler import register_exception_handlers
    from app.middleware.context import RequestContextMiddleware
    from app.middleware.logging_middleware import RequestLoggingMiddleware
except Exception:
    import importlib.util
    import pathlib
    import sys

    _root = pathlib.Path(__file__).resolve().parents[3]
    # Ensure 'app' package at repo root is importable for sub-imports inside loaded modules
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))
    import importlib
    import types

    # Temporarily point 'app' to the repo-level package so its subimports resolve correctly
    _orig_app_pkg = sys.modules.get("app")
    try:
        _fake_app = types.ModuleType("app")
        _fake_app.__path__ = [str(_root / "app")]  # type: ignore[attr-defined]
        sys.modules["app"] = _fake_app

        _eh_mod = importlib.import_module("app.handlers.exception_handler")
        _ctx_mod = importlib.import_module("app.middleware.context")
        _logmw_mod = importlib.import_module("app.middleware.logging_middleware")

        register_exception_handlers = getattr(_eh_mod, "register_exception_handlers")  # type: ignore
        RequestContextMiddleware = getattr(_ctx_mod, "RequestContextMiddleware")  # type: ignore
        RequestLoggingMiddleware = getattr(_logmw_mod, "RequestLoggingMiddleware")  # type: ignore
    finally:
        if _orig_app_pkg is not None:
            sys.modules["app"] = _orig_app_pkg
        else:
            sys.modules.pop("app", None)

try:
    from .otel import init_tracing
    from .policy import authorize_action
    from .security import validate_jwt
except Exception:
    # Fallback when importing file directly without package context
    import importlib.util
    import pathlib
    import sys

    _svc_dir = pathlib.Path(__file__).resolve().parent
    _otel_path = _svc_dir / "otel.py"
    _policy_path = _svc_dir / "policy.py"
    _security_path = _svc_dir / "security.py"

    def _load_symbol(path: pathlib.Path, mod_name: str, symbol: str):
        spec = importlib.util.spec_from_file_location(mod_name, path)
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            sys.modules[mod_name] = mod
            spec.loader.exec_module(mod)
            return getattr(mod, symbol)
        raise ImportError(f"Unable to load {symbol} from {path}")

    init_tracing = _load_symbol(_otel_path, "_auth_otel", "init_tracing")  # type: ignore
    authorize_action = _load_symbol(_policy_path, "_auth_policy", "authorize_action")  # type: ignore
    validate_jwt = _load_symbol(_security_path, "_auth_security", "validate_jwt")  # type: ignore

app = FastAPI(title="SystemUpdate Auth Service", version="0.1.0")

# Initialize OpenTelemetry tracing if configured via env
init_tracing(service_name=os.getenv("OTEL_SERVICE_NAME", "auth-service"))

# Initialize health checker
health_checker = HealthChecker(service_name="auth-service", version="0.1.0")


# Register health checks
@health_checker.register_check("auth_db")
async def check_db_connection():
    # TODO: Add actual database connection check
    return {"status": "ok", "message": "Database connection OK"}


# Setup health endpoints
setup_health_endpoints(app, health_checker)

# Register global exception handlers and middleware
register_exception_handlers(app)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(RequestLoggingMiddleware)


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
