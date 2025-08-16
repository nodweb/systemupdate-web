import os
import time
from typing import Any, Dict, Optional

import httpx
from jose import jwt

JWKS_CACHE: Dict[str, Any] = {"keys": None, "fetched_at": 0}
JWKS_TTL_SECONDS = int(os.getenv("OIDC_JWKS_TTL", "300"))


def _jwks_url() -> str:
    url = os.getenv("OIDC_JWKS_URL")
    issuer = os.getenv("OIDC_ISSUER")
    if not url:
        if issuer:
            url = issuer.rstrip("/") + "/.well-known/jwks.json"
        else:
            raise RuntimeError("OIDC_JWKS_URL or OIDC_ISSUER must be set")
    return url


def _get_jwks() -> Dict[str, Any]:
    now = int(time.time())
    if JWKS_CACHE["keys"] and now - JWKS_CACHE["fetched_at"] < JWKS_TTL_SECONDS:
        return JWKS_CACHE["keys"]
    url = _jwks_url()
    resp = httpx.get(url, timeout=5.0)
    resp.raise_for_status()
    data = resp.json()
    JWKS_CACHE["keys"] = data
    JWKS_CACHE["fetched_at"] = now
    return data


def _find_key(jwks: Dict[str, Any], kid: str) -> Optional[Dict[str, Any]]:
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            return k
    return None


def validate_jwt(token: str) -> Dict[str, Any]:
    unverified_headers = jwt.get_unverified_header(token)
    kid = unverified_headers.get("kid")
    if not kid:
        raise ValueError("missing kid")

    jwks = _get_jwks()
    key = _find_key(jwks, kid)
    if not key:
        raise ValueError("key not found for kid")

    audience = os.getenv("OIDC_AUDIENCE")
    issuer = os.getenv("OIDC_ISSUER")
    alg = os.getenv("OIDC_ALG", "RS256")
    leeway = int(os.getenv("CLOCK_SKEW_LEEWAY", "60"))

    claims = jwt.decode(
        token,
        key,
        algorithms=[alg],
        audience=audience,
        issuer=issuer,
        options={"leeway": leeway},
    )
    return claims


def _validate_via_auth_service(token: str) -> Optional[Dict[str, Any]]:
    url = os.getenv("AUTH_INTROSPECT_URL")
    if not url:
        return None
    try:
        r = httpx.post(url, json={"token": token}, timeout=5.0)
        if r.status_code != 200:
            return None
        data = r.json()
        if not data.get("active"):
            return None
        return data
    except Exception:
        return None


def validate_token(token: str) -> bool:
    """Prefer auth-service introspect when AUTH_INTROSPECT_URL is set; else local JWKS."""
    if os.getenv("AUTH_INTROSPECT_URL"):
        return _validate_via_auth_service(token) is not None
    try:
        claims = validate_jwt(token)
        return bool(claims.get("sub"))
    except Exception:
        return False


def get_claims(token: str) -> Dict[str, Any]:
    """Return JWT claims using remote introspection when configured; else JWKS decode.
    Returns empty dict if token invalid.
    """
    if os.getenv("AUTH_INTROSPECT_URL"):
        data = _validate_via_auth_service(token)
        return data or {}
    try:
        return validate_jwt(token)
    except Exception:
        return {}
