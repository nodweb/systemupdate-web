package systemupdate

import future.keywords.in

# Default deny
allow = false

# Allow access to health endpoints
allow {
    input.method == "GET"
    input.path == ["health"]
}

# Allow access to public endpoints
allow {
    input.method == "GET"
    input.path == ["public"]
}

# Allow access to metrics
allow {
    input.method == "GET"
    input.path == ["metrics"]
}

# Allow access to API documentation
allow {
    input.method == "GET"
    input.path == ["docs"]
}

# Allow access to OpenAPI specification
allow {
    input.method == "GET"
    input.path == ["openapi.json"]
}

# Allow access to Swagger UI
allow {
    input.method == "GET"
    input.path == ["docs", "redoc"]
}

allow {
    input.method == "GET"
    input.path == ["docs", "swagger"]
}

# Example: Allow users to read their own profile
allow {
    input.method == "GET"
    input.path == ["users", user_id]
    input.user.id == user_id
}

# Example: Allow admins to manage all resources
allow {
    "admin" in input.user.roles
}

# Example: Allow specific roles to access specific endpoints
allow {
    required_roles := {"admin", "editor"}
    some role in required_roles
    role in input.user.roles
    input.path[0] == "admin"
}

# Example: Time-based access control
allow {
    time.now_ns() >= time.parse_rfc3339_ns("2023-01-01T00:00:00Z")
    time.now_ns() <= time.parse_rfc3339_ns("2023-12-31T23:59:59Z")
    input.path == ["seasonal"]
}

# Example: Rate limiting
ratelimit = {
    "rate": 100,
    "burst": 50,
    "ttl": 60
}
