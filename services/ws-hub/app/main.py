import asyncio
from datetime import datetime, timezone
from typing import Dict

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect

# shared health utilities with fallback to repo root path
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
    import importlib
    import pathlib
    import sys
    import types

    _root = pathlib.Path(__file__).resolve().parents[3]
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))
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
    from .policy import allow_ws_connect
    from .security import get_claims as _sec_get_claims
    from .security import validate_token as _sec_validate_token
except Exception:
    # Fallback when importing file directly without package context
    import importlib.util
    import pathlib
    import sys

    _svc_dir = pathlib.Path(__file__).resolve().parent
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

    allow_ws_connect = _load_symbol(_policy_path, "_wshub_policy", "allow_ws_connect")  # type: ignore
    _sec_get_claims = _load_symbol(_security_path, "_wshub_security", "get_claims")  # type: ignore
    _sec_validate_token = _load_symbol(
        _security_path, "_wshub_security", "validate_token"
    )  # type: ignore

app = FastAPI(title="SystemUpdate WS Hub", version="0.1.0")

# Initialize health checker
health_checker = HealthChecker(service_name="ws-hub", version="0.1.0")


async def check_websocket_health():
    """Check WebSocket connection health"""
    try:
        # Check if there are any active connections
        active_connections = sum(
            1
            for conn in connections.values()
            if (datetime.now(timezone.utc) - conn.last_pong).total_seconds()
            < HEARTBEAT_INTERVAL_SEC * 2
        )

        # Get connection statistics
        stats = {
            "total_connections": len(connections),
            "active_connections": active_connections,
            "inactive_connections": len(connections) - active_connections,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

        # Check if we have any stale connections
        stale_connections = [
            cid
            for cid, conn in connections.items()
            if (datetime.now(timezone.utc) - conn.last_pong).total_seconds()
            > HEARTBEAT_INTERVAL_SEC * 2
        ]

        if stale_connections:
            return {
                "status": "warning",
                "message": f"Found {len(stale_connections)} stale connections",
                **stats,
            }

        return {"status": "ok", "message": "WebSocket connections healthy", **stats}

    except Exception as e:
        return {
            "status": "error",
            "message": f"WebSocket health check failed: {str(e)}",
            "total_connections": len(connections),
            "error": str(e),
        }


# Register health checks
health_checker.add_check("websocket", check_websocket_health)

# Setup health endpoints
setup_health_endpoints(app, health_checker)

# Register global exception handlers and middleware
register_exception_handlers(app)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# OpenTelemetry initialization (no-op if not configured via env)
try:
    from .otel import init_tracing

    init_tracing(service_name="ws-hub", app=app)
except Exception:
    # Do not fail service if observability is misconfigured in dev
    pass

HEARTBEAT_INTERVAL_SEC = 15


# Health check endpoints are now provided by setup_health_endpoints


class Connection:
    def __init__(self, ws: WebSocket, client_id: str):
        self.ws = ws
        self.client_id = client_id
        self.last_pong: datetime = datetime.now(timezone.utc)
        self.alive = True

    async def sender(self):
        try:
            while self.alive:
                await asyncio.sleep(HEARTBEAT_INTERVAL_SEC)
                # send ping
                await self.ws.send_json(
                    {"type": "ping", "ts": datetime.now(timezone.utc).isoformat()}
                )
        except Exception:
            self.alive = False

    async def receiver(self):
        try:
            while self.alive:
                msg = await self.ws.receive_json()
                if isinstance(msg, dict) and msg.get("type") == "pong":
                    self.last_pong = datetime.now(timezone.utc)
                    # Do not echo pong messages; just update heartbeat timestamp
                    continue
                # echo for now (stub) for all non-pong messages
                await self.ws.send_json({"type": "echo", "data": msg})
        except Exception:
            self.alive = False


connections: Dict[str, Connection] = {}


def validate_token(token: str) -> bool:
    # Backward-compatible helper (kept for tests); prefer get_claims + policy
    return _sec_validate_token(token)


@app.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket, token: str = Query(default=""), cid: str = Query(default="")
):
    # Require token, client id, and policy allow
    claims = _sec_get_claims(token) if token else {}
    if not cid or not claims or not allow_ws_connect(claims, cid):
        await ws.close(code=4401)
        return
    await ws.accept()
    conn = Connection(ws, cid)
    connections[cid] = conn
    sender_task = asyncio.create_task(conn.sender())
    receiver_task = asyncio.create_task(conn.receiver())
    try:
        await asyncio.wait(
            {sender_task, receiver_task}, return_when=asyncio.FIRST_COMPLETED
        )
    except WebSocketDisconnect:
        pass
    finally:
        conn.alive = False
        sender_task.cancel()
        receiver_task.cancel()
        connections.pop(cid, None)
        try:
            await ws.close()
        except Exception:
            pass
