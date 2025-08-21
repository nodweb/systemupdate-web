"""Pytest configuration for security tests."""
import os
import pytest
from typing import Dict, Any, Generator
import requests

# Test configuration
class TestConfig:
    """Test configuration for security tests."""
    
    # Keycloak configuration
    KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
    REALM = os.getenv("KEYCLOAK_REALM", "systemupdate")
    CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "systemupdate-web")
    CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET", "your-client-secret")
    
    # Test users
    TEST_USER = os.getenv("TEST_USER", "testuser")
    TEST_PASSWORD = os.getenv("TEST_PASSWORD", "testpass")
    ADMIN_USER = os.getenv("ADMIN_USER", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")
    
    # API configuration
    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
    OPA_URL = os.getenv("OPA_URL", "http://localhost:8181")

@pytest.fixture(scope="session")
def test_config() -> TestConfig:
    """Return test configuration."""
    return TestConfig()

@pytest.fixture(scope="session")
def admin_token(test_config: TestConfig) -> str:
    """Get admin access token."""
    return _get_token(
        test_config.KEYCLOAK_URL,
        test_config.REALM,
        test_config.CLIENT_ID,
        test_config.CLIENT_SECRET,
        test_config.ADMIN_USER,
        test_config.ADMIN_PASSWORD
    )

@pytest.fixture(scope="session")
def test_user_token(test_config: TestConfig) -> str:
    """Get test user access token."""
    return _get_token(
        test_config.KEYCLOAK_URL,
        test_config.REALM,
        test_config.CLIENT_ID,
        test_config.CLIENT_SECRET,
        test_config.TEST_USER,
        test_config.TEST_PASSWORD
    )

def _get_token(keycloak_url: str, realm: str, client_id: str, client_secret: str, 
              username: str, password: str) -> str:
    """Get access token from Keycloak."""
    token_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "password",
        "username": username,
        "password": password,
    }
    
    try:
        response = requests.post(token_url, data=data, timeout=10)
        response.raise_for_status()
        return response.json()["access_token"]
    except requests.exceptions.RequestException as e:
        pytest.fail(f"Failed to get access token: {e}")

@pytest.fixture
def admin_headers(admin_token: str) -> Dict[str, str]:
    """Get headers with admin token."""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }

@pytest.fixture
def user_headers(test_user_token: str) -> Dict[str, str]:
    """Get headers with test user token."""
    return {
        "Authorization": f"Bearer {test_user_token}",
        "Content-Type": "application/json"
    }
