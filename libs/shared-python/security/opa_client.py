import os
from typing import Any, Dict

import httpx

OPA_REQUIRED = os.getenv("OPA_REQUIRED", "false").lower() in {"1", "true", "yes"}
OPA_URL = os.getenv("OPA_URL", "http://localhost:8181/v1/data/systemupdate/allow")
OPA_TIMEOUT = float(os.getenv("OPA_TIMEOUT", "3.0"))


async def evaluate(token: str | None, action: str, resource: str, subject: Dict[str, Any] | None = None,
                   url: str | None = None) -> Dict[str, Any]:
    """
    Call an OPA data endpoint and return the raw decision.

    Expected response shape:
      { "result": { "allow": true, ... } }
    """
    if not (url or OPA_URL):
        return {"result": {"allow": True}}

    payload: Dict[str, Any] = {
        "input": {
            "token": token,
            "action": action,
            "resource": resource,
            "subject": subject or {},
        }
    }
    async with httpx.AsyncClient(timeout=OPA_TIMEOUT) as client:
        r = await client.post(url or OPA_URL, json=payload)
        r.raise_for_status()
        return r.json()


async def enforce(token: str | None, action: str, resource: str, subject: Dict[str, Any] | None = None,
                  url: str | None = None, required: bool | None = None) -> bool:
    """
    Optional policy enforcement with allow-all default when disabled.

    - If required is False (or OPA_REQUIRED is false), always returns True (allow).
    - If required is True, deny on any error or when decision is not allow.
    """
    must_enforce = OPA_REQUIRED if required is None else required
    if not must_enforce:
        return True
    try:
        data = await evaluate(token, action, resource, subject=subject, url=url)
        allow = bool(((data or {}).get("result") or {}).get("allow", False))
        return allow
    except Exception:
        return False
