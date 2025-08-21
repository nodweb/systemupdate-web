"""Script to set up test users and roles for security testing."""
import os
import json
import requests
from typing import Dict, Any, List, Optional

class KeycloakAdmin:
    """Helper class for Keycloak admin operations."""
    
    def __init__(self, server_url: str, realm: str, username: str, password: str):
        """Initialize with Keycloak connection details."""
        self.server_url = server_url.rstrip('/')
        self.realm = realm
        self.username = username
        self.password = password
        self.token = None
        self._base_url = f"{self.server_url}/admin/realms/{self.realm}"
        self._session = requests.Session()
        
    def login(self) -> None:
        """Authenticate with Keycloak and get admin token."""
        token_url = f"{self.server_url}/realms/master/protocol/openid-connect/token"
        data = {
            'client_id': 'admin-cli',
            'username': self.username,
            'password': self.password,
            'grant_type': 'password'
        }
        
        response = requests.post(token_url, data=data, timeout=10)
        response.raise_for_status()
        self.token = response.json()['access_token']
        self._session.headers.update({
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        })
    
    def create_user(self, username: str, password: str, 
                   first_name: str = "", last_name: str = "", 
                   email: str = "", enabled: bool = True) -> str:
        """Create a new user in Keycloak."""
        user_url = f"{self._base_url}/users"
        user = {
            "username": username,
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "enabled": enabled,
            "credentials": [{
                "type": "password",
                "value": password,
                "temporary": False
            }]
        }
        
        response = self._session.post(user_url, json=user, timeout=10)
        if response.status_code == 409:  # User already exists
            user_id = self._get_user_id(username)
            if user_id:
                return user_id
            response.raise_for_status()
        else:
            response.raise_for_status()
            # Get the user ID from the Location header
            user_id = response.headers['Location'].split('/')[-1]
        
        return user_id
    
    def assign_role(self, user_id: str, role_name: str) -> None:
        """Assign a realm role to a user."""
        # Get the role ID
        role_url = f"{self._base_url}/roles/{role_name}"
        response = self._session.get(role_url, timeout=10)
        response.raise_for_status()
        role = response.json()
        
        # Assign the role to the user
        user_roles_url = f"{self._base_url}/users/{user_id}/role-mappings/realm"
        response = self._session.post(user_roles_url, json=[role], timeout=10)
        response.raise_for_status()
    
    def create_client_role(self, client_id: str, role_name: str, 
                         description: str = "") -> None:
        """Create a client role."""
        # Get the client
        clients_url = f"{self._base_url}/clients"
        response = self._session.get(clients_url, params={'clientId': client_id}, timeout=10)
        response.raise_for_status()
        clients = response.json()
        
        if not clients:
            raise ValueError(f"Client {client_id} not found")
            
        client = clients[0]
        
        # Create the role
        role_url = f"{self._base_url}/clients/{client['id']}/roles"
        role = {
            "name": role_name,
            "description": description
        }
        
        response = self._session.post(role_url, json=role, timeout=10)
        if response.status_code != 409:  # 409 means role already exists
            response.raise_for_status()
    
    def _get_user_id(self, username: str) -> Optional[str]:
        """Get the internal Keycloak user ID for a username."""
        users_url = f"{self._base_url}/users"
        response = self._session.get(
            users_url, 
            params={'username': username, 'exact': 'true'},
            timeout=10
        )
        response.raise_for_status()
        users = response.json()
        return users[0]['id'] if users else None

def setup_test_users():
    """Set up test users and roles for security testing."""
    # Configuration - in a real app, load from environment or config file
    config = {
        'keycloak_url': os.getenv('KEYCLOAK_URL', 'http://localhost:8080'),
        'realm': os.getenv('KEYCLOAK_REALM', 'systemupdate'),
        'admin_username': os.getenv('KEYCLOAK_ADMIN', 'admin'),
        'admin_password': os.getenv('KEYCLOAK_ADMIN_PASSWORD', 'admin'),
        'client_id': os.getenv('KEYCLOAK_CLIENT_ID', 'systemupdate-web'),
        'test_users': [
            {
                'username': 'testuser',
                'password': 'testpass',
                'email': 'testuser@example.com',
                'first_name': 'Test',
                'last_name': 'User',
                'roles': ['user']
            },
            {
                'username': 'adminuser',
                'password': 'adminpass',
                'email': 'admin@example.com',
                'first_name': 'Admin',
                'last_name': 'User',
                'roles': ['admin', 'user']
            }
        ]
    }
    
    try:
        # Initialize Keycloak admin client
        kc = KeycloakAdmin(
            server_url=config['keycloak_url'],
            realm=config['realm'],
            username=config['admin_username'],
            password=config['admin_password']
        )
        
        # Log in to get admin token
        print("Logging in to Keycloak...")
        kc.login()
        
        # Create test users
        for user in config['test_users']:
            print(f"Creating user: {user['username']}")
            user_id = kc.create_user(
                username=user['username'],
                password=user['password'],
                email=user['email'],
                first_name=user.get('first_name', ''),
                last_name=user.get('last_name', '')
            )
            
            # Assign roles
            for role in user.get('roles', []):
                print(f"  Assigning role: {role}")
                kc.assign_role(user_id, role)
        
        print("Test users created successfully!")
        
    except Exception as e:
        print(f"Error setting up test users: {e}")
        raise

if __name__ == "__main__":
    setup_test_users()
