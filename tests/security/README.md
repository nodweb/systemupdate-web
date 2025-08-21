# Security Testing

This directory contains end-to-end tests for verifying the security and authorization
policies of the SystemUpdate application.

## Test Structure

- `conftest.py`: Pytest fixtures and configuration
- `test_opa_policies.py`: Tests for OPA policy enforcement
- `setup_test_users.py`: Script to set up test users in Keycloak
- `test_data/`: Directory for test data (if needed)

## Prerequisites

1. Keycloak server running with the SystemUpdate realm configured
2. OPA server running with the SystemUpdate policies loaded
3. SystemUpdate API services running
4. Python 3.8+ with required packages (install with `pip install -r requirements-test.txt`)

## Setting Up Test Users

Before running the tests, you need to set up test users in Keycloak:

```bash
# Set environment variables if needed
export KEYCLOAK_URL=http://localhost:8080
export KEYCLOAK_ADMIN=admin
export KEYCLOAK_ADMIN_PASSWORD=admin

# Run the setup script
python -m tests.security.setup_test_users
```

This will create the following test users:

- **testuser** / testpass (user role)
- **adminuser** / adminpass (admin and user roles)

## Running Tests

To run the security tests:

```bash
# Run all security tests
pytest tests/security/

# Run a specific test file
pytest tests/security/test_opa_policies.py

# Run with detailed output
pytest -v tests/security/

# Run with coverage report
pytest --cov=app --cov-report=term-missing tests/security/
```

## Test Environment Variables

The following environment variables can be used to configure the tests:

- `KEYCLOAK_URL`: Base URL of the Keycloak server (default: http://localhost:8080)
- `KEYCLOAK_REALM`: Keycloak realm (default: systemupdate)
- `KEYCLOAK_CLIENT_ID`: Keycloak client ID (default: systemupdate-web)
- `KEYCLOAK_CLIENT_SECRET`: Keycloak client secret
- `TEST_USER`: Test username (default: testuser)
- `TEST_PASSWORD`: Test user password (default: testpass)
- `ADMIN_USER`: Admin username (default: admin)
- `ADMIN_PASSWORD`: Admin password (default: admin)
- `API_BASE_URL`: Base URL of the API (default: http://localhost:8000)
- `OPA_URL`: Base URL of the OPA server (default: http://localhost:8181)

## Writing New Tests

When writing new security tests:

1. Use the existing fixtures in `conftest.py` for authentication
2. Test both positive and negative cases
3. Test different roles and permissions
4. Test edge cases and error conditions
5. Keep tests independent and idempotent

Example test:

```python
def test_admin_access(admin_headers):
    """Test that admin can access admin endpoints."""
    response = requests.get(
        f"{API_BASE_URL}/admin/users",
        headers=admin_headers
    )
    assert response.status_code == 200
```

## Debugging

To debug test failures:

1. Check the test logs for error messages
2. Verify that the test users have the correct roles in Keycloak
3. Check the OPA decision logs for policy evaluation details
4. Use `pytest -s` to see print output during test execution
5. Use `pytest --pdb` to drop into the debugger on failure
