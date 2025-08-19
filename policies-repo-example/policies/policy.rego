package systemupdate

# Top-level allow: delegate to package rules
# Input is expected to include: method, path, action, subject, tenant, roles, etc.
# Services query: /v1/data/systemupdate/allow

default allow = false

allow {
  # Example: allow read-only GETs by default
  input.method == "GET"
}

allow {
  # Example role-based allow
  some r
  r := input.roles[_]
  r == "admin"
}
