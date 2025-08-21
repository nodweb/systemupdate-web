const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  keycloakUrl: 'http://localhost:8080',
  adminUser: process.env.KEYCLOAK_ADMIN || 'admin',
  adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
  realm: 'systemupdate-dev',
  clientId: 'systemupdate-backend',
  clientSecret: 'your-client-secret', // In production, use a secure secret
  redirectUris: ['http://localhost:3000/*', 'http://localhost:8080/*'],
  webOrigins: ['http://localhost:3000', 'http://localhost:8080']
};

// Get admin token
async function getAdminToken() {
  try {
    const response = await axios.post(
      `${config.keycloakUrl}/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: 'admin-cli',
        username: config.adminUser,
        password: config.adminPassword,
        grant_type: 'password',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting admin token:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Create realm
async function createRealm(token) {
  try {
    await axios.post(
      `${config.keycloakUrl}/admin/realms`,
      {
        id: config.realm,
        realm: config.realm,
        enabled: true,
        displayName: 'SystemUpdate Development',
        sslRequired: 'external',
        registrationAllowed: false,
        loginWithEmailAllowed: true,
        duplicateEmailsAllowed: false,
        resetPasswordAllowed: true,
        editUsernameAllowed: false,
        bruteForceProtected: true,
        ssoSessionIdleTimeout: 1800,
        ssoSessionMaxLifespan: 36000,
        accessTokenLifespan: 300,
        accessTokenLifespanForImplicitFlow: 900,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Created realm: ${config.realm}`);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`Realm ${config.realm} already exists`);
    } else {
      console.error('Error creating realm:', error.response?.data || error.message);
      process.exit(1);
    }
  }
}

// Create client
async function createClient(token) {
  try {
    await axios.post(
      `${config.keycloakUrl}/admin/realms/${config.realm}/clients`,
      {
        clientId: config.clientId,
        name: 'SystemUpdate Backend',
        description: 'SystemUpdate Backend Services',
        enabled: true,
        clientAuthenticatorType: 'client-secret',
        secret: config.clientSecret,
        redirectUris: config.redirectUris,
        webOrigins: config.webOrigins,
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: true,
        publicClient: false,
        protocol: 'openid-connect',
        protocolMappers: [
          {
            name: 'audience',
            protocol: 'openid-connect',
            protocolMapper: 'oidc-audience-mapper',
            config: {
              'included.client.audience': config.clientId,
              'id.token.claim': 'false',
              'access.token.claim': 'true',
            },
          },
        ],
        defaultClientScopes: ['email', 'profile'],
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Created client: ${config.clientId}`);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`Client ${config.clientId} already exists`);
    } else {
      console.error('Error creating client:', error.response?.data || error.message);
      process.exit(1);
    }
  }
}

// Create test user
async function createTestUser(token) {
  try {
    await axios.post(
      `${config.keycloakUrl}/admin/realms/${config.realm}/users`,
      {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        enabled: true,
        emailVerified: true,
        credentials: [
          {
            type: 'password',
            value: 'test123',
            temporary: false,
          },
        ],
        realmRoles: ['offline_access', 'uma_authorization'],
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Created test user: testuser (password: test123)');
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('Test user already exists');
    } else {
      console.error('Error creating test user:', error.response?.data || error.message);
    }
  }
}

// Get client secret
async function getClientSecret(token) {
  try {
    const response = await axios.get(
      `${config.keycloakUrl}/admin/realms/${config.realm}/clients?clientId=${config.clientId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.data && response.data.length > 0) {
      const clientId = response.data[0].id;
      const secretResponse = await axios.get(
        `${config.keycloakUrl}/admin/realms/${config.realm}/clients/${clientId}/client-secret`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (secretResponse.data && secretResponse.data.value) {
        return secretResponse.data.value;
      }
    }
    return config.clientSecret;
  } catch (error) {
    console.error('Error getting client secret:', error.response?.data || error.message);
    return config.clientSecret;
  }
}

// Generate .env file with Keycloak configuration
async function generateEnvFile(clientSecret) {
  const envContent = `# Keycloak Configuration
KEYCLOAK_URL=${config.keycloakUrl}
KEYCLOAK_REALM=${config.realm}
KEYCLOAK_CLIENT_ID=${config.clientId}
KEYCLOAK_CLIENT_SECRET=${clientSecret}
KEYCLOAK_JWKS_URI=${config.keycloakUrl}/realms/${config.realm}/protocol/openid-connect/certs

# Kong Configuration
AUTH_REQUIRED=true
`;

  const envPath = path.join(__dirname, '../../.env');
  fs.writeFileSync(envPath, envContent, { flag: 'w' });
  console.log(`Generated .env file at ${envPath}`);
}

// Main function
async function main() {
  try {
    console.log('Setting up Keycloak...');
    
    // Wait for Keycloak to be ready
    console.log('Waiting for Keycloak to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const token = await getAdminToken();
    await createRealm(token);
    await createClient(token);
    await createTestUser(token);
    const clientSecret = await getClientSecret(token);
    await generateEnvFile(clientSecret);
    
    console.log('Keycloak setup completed successfully!');
    console.log('Keycloak Admin Console: http://localhost:8080/admin');
    console.log('Realm Login Page: http://localhost:8080/realms/systemupdate-dev/account');
    console.log('Test User: testuser / test123');
    console.log('Client ID:', config.clientId);
    console.log('Client Secret:', clientSecret);
    
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

main();
