# OPA Policies for SystemUpdate

This directory contains Open Policy Agent (OPA) policies for the SystemUpdate application. These policies define the authorization rules for the application.

## Policy Structure

- `systemupdate.rego`: Main policy file containing the authorization rules
- `systemupdate_test.rego`: Test cases for the policies

## Development

### Prerequisites

- Docker and Docker Compose
- OPA CLI (optional, for local testing)

### Running Policies Locally

1. Start the OPA server:
   ```bash
   docker-compose -f docker-compose.opa.yml up -d
   ```

2. Load and test the policies:
   ```powershell
   .\scripts\test-opa-policies.ps1
   ```

### Policy Development Workflow

1. Make changes to the policy files in `opa/policies/`
2. Run the tests to verify your changes:
   ```powershell
   .\scripts\test-opa-policies.ps1
   ```
3. If the tests pass, commit your changes

## Policy Examples

### Allow access to health endpoints

```rego
allow {
    input.method == "GET"
    input.path == ["health"]
}
```

### Role-based access control

```rego
# Allow admins to access all resources
allow {
    "admin" in input.user.roles
}

# Allow specific roles to access specific endpoints
allow {
    required_roles := {"admin", "editor"}
    some role in required_roles
    role in input.user.roles
    input.path[0] == "admin"
}
```

### Resource ownership

```rego
# Allow users to access their own resources
allow {
    input.method == "GET"
    input.path == ["users", user_id]
    input.user.id == user_id
}
```

## Testing

Tests are written in the `*_test.rego` files. Each test defines input data and expected results.

Example test:

```rego
test_allow_health_endpoint {
    allow with input as {
        "method": "GET",
        "path": ["health"],
        "user": {
            "id": "test-user",
            "roles": ["user"]
        }
    }
}
```

## Integration with Services

Services can query the OPA server at `http://opa:8181/v1/data/systemupdate/allow` with an input like:

```json
{
  "method": "GET",
  "path": ["admin", "users"],
  "user": {
    "id": "john",
    "roles": ["admin"]
  }
}
```

The response will be a JSON object with an `allow` field indicating whether the request is authorized.
