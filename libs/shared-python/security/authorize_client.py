import os
from typing import Any, Dict, Optional

import httpx

DEFAULT_INTROSPECT_URL = "http://auth-service:8001/api/auth/introspect"
DEFAULT_AUTHORIZE_URL = "http://auth-service:8001/api/auth/authorize"


async def introspect(token: str, url: Optional[str] = None, timeout: float = 5.0) -> Dict[str, Any]:
    u = url or os.getenv("AUTH_INTROSPECT_URL", DEFAULT_INTROSPECT_URL)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(u, json={"token": token})
        r.raise_for_status()
        return r.json()


async def authorize(
    token: str,
    action: str,
    resource: str,
    url: Optional[str] = None,
    timeout: float = 5.0,
) -> Dict[str, Any]:
    u = url or os.getenv("AUTH_AUTHORIZE_URL", DEFAULT_AUTHORIZE_URL)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(u, json={"token": token, "action": action, "resource": resource})
        # Let caller decide on 403 behavior; raise for others
        if r.status_code != 403:
            r.raise_for_status()
        return r.json() if r.content else {"allow": r.status_code == 200}
