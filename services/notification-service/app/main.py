import logging
import os
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse

# Import shared health check module with fallback to repo root path
try:
    from libs.shared_python.health import HealthChecker, setup_health_endpoints
except Exception:
    import pathlib
    import sys

    _root = pathlib.Path(__file__).resolve().parents[3]
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))
    from libs.shared_python.health import HealthChecker, setup_health_endpoints
# Try monorepo-level handlers/middleware; fall back to dynamic import by path
try:
    from app.handlers.exception_handler import register_exception_handlers
    from app.middleware.context import RequestContextMiddleware
    from app.middleware.logging_middleware import RequestLoggingMiddleware
except Exception:
    import importlib
    import pathlib
    import sys
    import types

    _root = pathlib.Path(__file__).resolve().parents[3]
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))
    _orig_app_pkg = sys.modules.get("app")
    try:
        _fake_app = types.ModuleType("app")
        _fake_app.__path__ = [str(_root / "app")]  # type: ignore[attr-defined]
        sys.modules["app"] = _fake_app

        _eh_mod = importlib.import_module("app.handlers.exception_handler")
        _ctx_mod = importlib.import_module("app.middleware.context")
        _log_mod = importlib.import_module("app.middleware.logging_middleware")

        register_exception_handlers = getattr(_eh_mod, "register_exception_handlers")  # type: ignore
        RequestContextMiddleware = getattr(_ctx_mod, "RequestContextMiddleware")  # type: ignore
        RequestLoggingMiddleware = getattr(_log_mod, "RequestLoggingMiddleware")  # type: ignore
    finally:
        if _orig_app_pkg is not None:
            sys.modules["app"] = _orig_app_pkg
        else:
            sys.modules.pop("app", None)

# Safe import for shared authorize client despite hyphen in directory name
try:
    from libs.shared_python.security.authorize_client import \
      authorize as auth_authorize
    from libs.shared_python.security.authorize_client import \
      introspect as auth_introspect  # type: ignore
except Exception:
    import importlib.util
    import pathlib
    import sys

    _root = pathlib.Path(__file__).resolve().parents[3]
    _ac_path = _root / "libs" / "shared-python" / "security" / "authorize_client.py"
    spec = importlib.util.spec_from_file_location("_authorize_client", _ac_path)
    if spec and spec.loader:
        _mod = importlib.util.module_from_spec(spec)
        sys.modules["_authorize_client"] = _mod
        spec.loader.exec_module(_mod)
        auth_introspect = getattr(_mod, "introspect")  # type: ignore
        auth_authorize = getattr(_mod, "authorize")  # type: ignore
    else:  # pragma: no cover
        raise ImportError("Unable to load authorize_client helper")

# Optional OPA client
try:
    from libs.shared_python.security.opa_client import \
      enforce as opa_enforce  # type: ignore
except Exception:
    try:
        import importlib.util
        import pathlib
        import sys

        _root = pathlib.Path(__file__).resolve().parents[3]
        _opa_path = _root / "libs" / "shared-python" / "security" / "opa_client.py"
        _spec_opa = importlib.util.spec_from_file_location("_opa_client", _opa_path)
        if _spec_opa and _spec_opa.loader:
            _mod_opa = importlib.util.module_from_spec(_spec_opa)
            sys.modules["_opa_client"] = _mod_opa
            _spec_opa.loader.exec_module(_mod_opa)
            opa_enforce = getattr(_mod_opa, "enforce")  # type: ignore
        else:
            opa_enforce = None  # type: ignore
    except Exception:
        opa_enforce = None  # type: ignore

# Optional JWT verifier dependency
DEPS_AUTH: list = []
try:
    from libs.shared_python.security.jwt_verifier import \
      require_auth as _require_auth  # type: ignore
except Exception:
    try:
        import importlib.util
        import pathlib
        import sys

        _root = pathlib.Path(__file__).resolve().parents[4]
        _jwt_path = _root / "libs" / "shared-python" / "security" / "jwt_verifier.py"
        _spec_jwt = importlib.util.spec_from_file_location("_jwt_verifier", _jwt_path)
        if _spec_jwt and _spec_jwt.loader:
            _mod_jwt = importlib.util.module_from_spec(_spec_jwt)
            sys.modules["_jwt_verifier"] = _mod_jwt
            _spec_jwt.loader.exec_module(_mod_jwt)
            _require_auth = getattr(_mod_jwt, "require_auth")  # type: ignore
        else:
            _require_auth = None  # type: ignore
    except Exception:
        _require_auth = None  # type: ignore
if (
    os.getenv("AUTH_REQUIRED", "false").lower() in {"1", "true", "yes"}
    and _require_auth is not None
):
    DEPS_AUTH = [Depends(_require_auth())]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("notification-service")

app = FastAPI(title="Notification Service", version="0.1.0")

# Initialize health checker
health_checker = HealthChecker(service_name="notification-service", version="0.1.0")


async def check_db_health():
    """Check database connection health"""
    try:
        # Check if using PostgreSQL
        db_url = os.getenv("DATABASE_URL")
        if db_url and "postgresql" in db_url:
            try:
                import asyncpg

                conn = await asyncpg.connect(db_url, timeout=2.0)
                await conn.execute("SELECT 1")
                await conn.close()
                return {"status": "ok", "message": "PostgreSQL connection OK"}
            except Exception as e:
                return {"status": "error", "message": f"Database error: {str(e)}"}
        # Fallback to in-memory check
        return {"status": "ok", "message": "Using in-memory storage"}
    except Exception as e:
        return {"status": "error", "message": f"Database check failed: {str(e)}"}


# Register health checks
health_checker.add_check("database", check_db_health)

# Setup health endpoints
setup_health_endpoints(app, health_checker)

# Register global exception handlers and middleware
register_exception_handlers(app)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Throttling config (in-memory sliding window per (alertname, source))
THROTTLE_WINDOW_SECONDS = int(os.getenv("NOTIF_THROTTLE_WINDOW_SECONDS", "60"))
THROTTLE_LIMIT = int(os.getenv("NOTIF_THROTTLE_LIMIT", "20"))
_buckets: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)


def _key_for_alert(labels: Dict) -> Tuple[str, str]:
    name = str(labels.get("alertname") or "unknown")
    source = str(labels.get("instance") or labels.get("service_name") or "unknown")
    return name, source


def _allow_through(labels: Dict) -> bool:
    now = time.time()
    key = _key_for_alert(labels)
    dq = _buckets[key]
    # drop old timestamps outside the window
    cutoff = now - THROTTLE_WINDOW_SECONDS
    while dq and dq[0] < cutoff:
        dq.popleft()
    if len(dq) >= THROTTLE_LIMIT:
        return False
    dq.append(now)
    return True


@app.post("/alerts", dependencies=DEPS_AUTH)
async def receive_alerts(request: Request):
    # Optional auth/authz
    token = await _check_auth(request.headers)
    payload = await request.json()
    alerts = payload.get("alerts", [])

    accepted = 0
    throttled = 0
    for a in alerts:
        status = a.get("status")
        labels = a.get("labels", {})
        annotations = a.get("annotations", {})
        # Optional per-alert authorization: action based on status; resource = alertname
        await _check_authorize(
            token,
            action=f"alerts:{status or 'notify'}",
            resource=str(labels.get("alertname") or "unknown"),
        )
        if _allow_through(labels):
            accepted += 1
            logger.info(
                "ALERT %s name=%s severity=%s source=%s summary=%s",
                status,
                labels.get("alertname"),
                labels.get("severity"),
                labels.get("instance") or labels.get("service_name"),
                annotations.get("summary"),
            )
        else:
            throttled += 1
            logger.warning(
                "THROTTLED alert name=%s source=%s (limit=%d/%ds)",
                labels.get("alertname"),
                labels.get("instance") or labels.get("service_name"),
                THROTTLE_LIMIT,
                THROTTLE_WINDOW_SECONDS,
            )
    return JSONResponse(
        {"received": len(alerts), "accepted": accepted, "throttled": throttled}
    )


# --------------- Optional auth/authz helpers ---------------
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "false").lower() in {"1", "true", "yes"}
AUTHZ_REQUIRED = os.getenv("AUTHZ_REQUIRED", "false").lower() in {"1", "true", "yes"}
AUTH_INTROSPECT_URL = os.getenv(
    "AUTH_INTROSPECT_URL", "http://auth-service:8001/api/auth/introspect"
)
AUTH_AUTHORIZE_URL = os.getenv(
    "AUTH_AUTHORIZE_URL", "http://auth-service:8001/api/auth/authorize"
)


async def _bearer_token(headers: Dict[str, str]) -> str | None:
    auth = headers.get("authorization") or headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    return auth.split(" ", 1)[1].strip()


async def _check_auth(headers: Dict[str, str]) -> str | None:
    if not AUTH_REQUIRED and not AUTHZ_REQUIRED:
        return None
    token = await _bearer_token(headers)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token"
        )
    try:
        data = await auth_introspect(token, url=AUTH_INTROSPECT_URL)
        if not data.get("active"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="inactive token"
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="auth failure"
        )
    return token


async def _check_authorize(token: str | None, action: str, resource: str) -> None:
    if not AUTHZ_REQUIRED:
        return
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token"
        )
    try:
        data = await auth_authorize(
            token, action=action, resource=resource, url=AUTH_AUTHORIZE_URL
        )
        if not data.get("allow"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="forbidden"
            )
        # Optional OPA enforcement
        if opa_enforce is not None:
            allowed = await opa_enforce(
                token,
                action=action,
                resource=resource,
                subject=None,
                url=None,
                required=None,
            )
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="forbidden"
                )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="authz failure"
        )
