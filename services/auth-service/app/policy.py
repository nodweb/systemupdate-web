from typing import Any, Dict, Tuple

# Minimal OPA-like policy scaffold. In production, call OPA via REST or embed rego via wasm.
# Here we implement a simple RBAC check:
# - allow if role includes 'admin'
# - else allow if requested action is present in claims['scope'] (space-delimited)
# - resource is reserved for future attribute checks

def authorize_action(claims: Dict[str, Any], action: str, resource: str) -> Tuple[bool, str | None]:
    roles = set()
    if "roles" in claims and isinstance(claims["roles"], (list, tuple)):
        roles = set(claims["roles"])  # e.g., ["admin", "operator"]
    if "realm_access" in claims and isinstance(claims["realm_access"], dict):
        roles |= set(claims["realm_access"].get("roles", []))

    if "admin" in roles:
        return True, "role:admin"

    scope = claims.get("scope") or ""
    scope_set = set(scope.split()) if isinstance(scope, str) else set()
    if action in scope_set:
        return True, f"scope:{action}"

    return False, "policy_denied"
