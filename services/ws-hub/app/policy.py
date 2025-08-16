from typing import Dict, Any

# Minimal policy scaffolding for ws-hub.
# Later this can be replaced by a real OPA/OPAL integration or Rego evaluation.


def has_scope(claims: Dict[str, Any], required: str) -> bool:
    scopes = claims.get("scope") or claims.get("scp") or ""
    if isinstance(scopes, str):
        return required in {s.strip() for s in scopes.split()} if scopes else False
    if isinstance(scopes, list):
        return required in scopes
    return False


def allow_ws_connect(claims: Dict[str, Any], cid: str) -> bool:
    """
    Simple policy: require subject and one of the following:
    - Token has scope 'ws:connect'
    - Or token is bound to same cid (`cid` claim equals connection cid)
    This is intentionally minimal and can be extended with ABAC/RBAC later.
    """
    if not claims or not claims.get("sub"):
        return False

    if has_scope(claims, "ws:connect"):
        return True

    token_cid = claims.get("cid")
    if isinstance(token_cid, str) and token_cid == cid:
        return True

    return False
