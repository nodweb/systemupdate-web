import json
import os
import time
from typing import Any, Dict, Optional

import httpx
from jose import jwt
from jose.utils import base64url_decode

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
    """
    Validate a JWT using JWKS (RS256 by default). Returns decoded claims if valid.
    Env:
      - OIDC_AUDIENCE (optional)
      - OIDC_ISSUER (recommended)
      - OIDC_ALG (default RS256)
      - CLOCK_SKEW_LEEWAY (seconds, default 60)
    """
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

    # python-jose accepts the jwk dict directly
    claims = jwt.decode(
        token,
        key,
        algorithms=[alg],
        audience=audience,
        issuer=issuer,
        options={"leeway": leeway},
    )
    return claims
