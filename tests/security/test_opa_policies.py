"""End-to-end tests for OPA policy enforcement."""
import os
import json
import pytest
import requests
from typing import Dict, Any, Optional

# These tests hit external services (Keycloak, OPA). Mark as docker/integration-only.
pytestmark = pytest.mark.docker

# Configuration
KEYCLOAK_URL = "http://localhost:8080"
REALM = "systemupdate"
CLIENT_ID = "systemupdate-web"
CLIENT_SECRET = "your-client-secret"  # In production, use environment variables
TEST_USER = "testuser"
TEST_PASSWORD = "testpass"

# Test data
TEST_ROLES = ["user", "admin"]
TEST_PERMISSIONS = [
    {"resource": "devices", "action": "read"},
    {"resource": "devices", "action": "write"},
    {"resource": "users", "action": "read"},
]

class TestOPAPolicies:
    """End-to-end tests for OPA policy enforcement."""

    @pytest.fixture(scope="class")
    def auth_headers(self) -> Dict[str, str]:
        """Get authentication headers with valid token."""
        # Get access token from Keycloak
        token_url = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token"
        data = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "password",
            "username": TEST_USER,
            "password": TEST_PASSWORD,
        }
        
        response = requests.post(token_url, data=data, timeout=10)
        response.raise_for_status()
        token = response.json()["access_token"]
        
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def test_health_endpoint(self, auth_headers: Dict[str, str]):
        """Test that health endpoint is accessible without authentication."""
        response = requests.get("http://localhost:8000/healthz", timeout=5)
        assert response.status_code == 200

    def test_authenticated_endpoint(self, auth_headers: Dict[str, str]):
        """Test that authenticated endpoints require valid token."""
        # Test without token
        response = requests.get("http://localhost:8000/api/v1/devices", timeout=5)
        assert response.status_code == 401

        # Test with invalid token
        headers = {"Authorization": "Bearer invalid-token"}
        response = requests.get("http://localhost:8000/api/v1/devices", headers=headers, timeout=5)
        assert response.status_code in [401, 403]

        # Test with valid token
        response = requests.get("http://localhost:8000/api/v1/devices", headers=auth_headers, timeout=5)
        assert response.status_code in [200, 403]  # 403 if user doesn't have permission

    @pytest.mark.parametrize("role,resource,action,expected_status", [
        ("user", "devices", "read", 200),
        ("user", "devices", "write", 403),  # User role doesn't have write permission
        ("admin", "users", "read", 200),
        ("admin", "users", "write", 200),
    ])
    def test_role_based_access(self, auth_headers: Dict[str, str], role: str, 
                             resource: str, action: str, expected_status: int):
        """Test role-based access control."""
        # In a real test, you would set up the user with the specified role first
        # For now, we'll just test the expected behavior
        
        # Get user info to check roles
        user_info_url = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/userinfo"
        response = requests.get(user_info_url, headers=auth_headers, timeout=5)
        user_roles = response.json().get("realm_access", {}).get("roles", [])
        
        # Skip if test role doesn't match user's actual roles
        if role not in user_roles and expected_status == 200:
            pytest.skip(f"Test requires role '{role}' which is not assigned to the test user")
        
        # Test the endpoint
        endpoint = f"http://localhost:8000/api/v1/{resource}"
        if action == "read":
            response = requests.get(endpoint, headers=auth_headers, timeout=5)
        else:  # write
            response = requests.post(endpoint, headers=auth_headers, json={}, timeout=5)
            
        assert response.status_code == expected_status, \
            f"Expected status {expected_status} for {action} on {resource} with role {role}, got {response.status_code}"

    def test_opa_policy_evaluation(self, auth_headers: Dict[str, str]):
        """Test direct OPA policy evaluation."""
        # This test verifies that OPA is correctly evaluating policies
        opa_url = "http://localhost:8181/v1/data/systemupdate/allow"
        
        # Test case 1: Allowed action
        test_input = {
            "input": {
                "method": "GET",
                "path": ["api", "v1", "devices"],
                "user": {
                    "id": "testuser",
                    "roles": ["user"],
                    "permissions": [{"resource": "devices", "action": "read"}]
                }
            }
        }
        
        response = requests.post(opa_url, json=test_input, timeout=5)
        assert response.status_code == 200
        assert response.json().get("result") is True, "Expected policy to allow this request"
        
        # Test case 2: Denied action
        test_input["input"]["user"]["permissions"] = []  # No permissions
        
        response = requests.post(opa_url, json=test_input, timeout=5)
        assert response.status_code == 200
        assert response.json().get("result") is not True, "Expected policy to deny this request"
