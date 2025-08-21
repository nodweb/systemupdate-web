#Requires -Version 7.0

param (
    [switch]$SkipKeycloakSetup = $false,
    [switch]$SkipDocker = $false,
    [switch]$WithOpa = $true,
    [switch]$WithOpal = $false
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Join-Path $scriptPath ".." | Resolve-Path

Write-Host "=== SystemUpdate Development Environment Setup ===" -ForegroundColor Cyan

# Check for required tools
function Test-CommandExists {
    param($command)
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    if (-not $exists) {
        Write-Error "Required command '$command' not found. Please install it and ensure it's in your PATH."
        exit 1
    }
    return $true
}

# Check for required tools
Write-Host "`n[1/4] Checking required tools..." -ForegroundColor Green
Test-CommandExists "docker" | Out-Null
Test-CommandExists "docker-compose" | Out-Null
Test-CommandExists "node" | Out-Null
Test-CommandExists "npm" | Out-Null

# Start Docker services
if (-not $SkipDocker) {
    Write-Host "`n[2/4] Starting Docker services..." -ForegroundColor Green
    
    try {
        # Stop any running containers
        Write-Host "Stopping any running containers..."
        docker-compose down --remove-orphans
        
        # Build the command based on parameters
        $services = @("postgres", "redis", "keycloak-db", "keycloak")
        
        if ($WithOpa) {
            $services += "opa"
            Write-Host "Including OPA service..." -ForegroundColor Cyan
        }
        
        if ($WithOpal) {
            $services += "opal-server"
            Write-Host "Including OPAL server..." -ForegroundColor Cyan
        }
        
        # Start required services
        Write-Host "Starting services: $($services -join ', ')..."
        docker-compose up -d $services
        
        # Wait for services to be healthy
        Write-Host "Waiting for services to be ready..."
        $maxRetries = 30
        
        # Wait for Keycloak
        $retryCount = 0
        $keycloakReady = $false
        
        while (-not $keycloakReady -and $retryCount -lt $maxRetries) {
            try {
                $status = docker inspect --format='{{.State.Health.Status}}' su-keycloak 2>$null
                if ($status -eq "healthy") {
                    $keycloakReady = $true
                    Write-Host "✓ Keycloak is ready!" -ForegroundColor Green
                } else {
                    Write-Host "Waiting for Keycloak to be ready... (Status: $status)"
                    Start-Sleep -Seconds 5
                    $retryCount++
                }
            } catch {
                Write-Host "Waiting for Keycloak to start... (Attempt $($retryCount + 1)/$maxRetries)"
                Start-Sleep -Seconds 5
                $retryCount++
            }
        }
        
        # Wait for OPA if enabled
        if ($WithOpa) {
            $retryCount = 0
            $opaReady = $false
            
            while (-not $opaReady -and $retryCount -lt $maxRetries) {
                try {
                    $status = Invoke-RestMethod -Uri "http://localhost:8181/health" -Method Get -ErrorAction Stop
                    if ($status.healthy -eq $true) {
                        $opaReady = $true
                        Write-Host "✓ OPA is ready!" -ForegroundColor Green
                        
                        # Load policies
                        Write-Host "Loading OPA policies..."
                        & "$PSScriptRoot\test-opa-policies.ps1"
                    } else {
                        Write-Host "Waiting for OPA to be ready..."
                        Start-Sleep -Seconds 2
                        $retryCount++
                    }
                } catch {
                    Write-Host "Waiting for OPA to start... (Attempt $($retryCount + 1)/$maxRetries)"
                    Start-Sleep -Seconds 2
                    $retryCount++
                }
            }
            
            if (-not $opaReady) {
                Write-Warning "Timed out waiting for OPA to start. Policies may not be loaded."
            }
        }
        
        if (-not $keycloakReady) {
            Write-Error "Timed out waiting for Keycloak to start. Please check the logs with: docker logs su-keycloak"
            exit 1
        }
        
    } catch {
        Write-Error "Failed to start Docker services: $_"
        exit 1
    }
}

# Setup Keycloak
if (-not $SkipKeycloakSetup) {
    Write-Host "`n[3/4] Setting up Keycloak..." -ForegroundColor Green
    
    try {
        # Install Node.js dependencies if needed
        $scriptsDir = Join-Path $rootPath "scripts"
        Push-Location $scriptsDir
        
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing Node.js dependencies..."
            npm install
        }
        
        # Run Keycloak setup script
        Write-Host "Configuring Keycloak realm and client..."
        $env:KEYCLOAK_ADMIN = "admin"
        $env:KEYCLOAK_ADMIN_PASSWORD = "admin"
        npm run setup
        
        Pop-Location
        
    } catch {
        Write-Error "Failed to set up Keycloak: $_"
        exit 1
    }
} else {
    Write-Host "`n[3/4] Skipping Keycloak setup as requested..." -ForegroundColor Yellow
}

# Update .env file
Write-Host "`n[4/4] Updating environment configuration..." -ForegroundColor Green

$envContent = @"
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=systemupdate-dev
KEYCLOAK_CLIENT_ID=systemupdate-backend
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_JWKS_URI=http://localhost:8080/realms/systemupdate-dev/protocol/openid-connect/certs

# Kong Configuration
AUTH_REQUIRED=true

# Database Configuration
POSTGRES_USER=systemupdate
POSTGRES_PASSWORD=systemupdate
POSTGRES_DB=systemupdate
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis Configuration
REDIS_URL=redis://redis:6379

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_ISSUER=systemupdate
JWT_AUDIENCE=systemupdate
"@

$envPath = Join-Path $rootPath ".env"
$envContent | Out-File -FilePath $envPath -Encoding utf8 -Force

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "Keycloak Admin Console: http://localhost:8080/admin" -ForegroundColor Cyan
Write-Host "  - Username: admin"
Write-Host "  - Password: admin"
Write-Host "`nTest User:" -ForegroundColor Cyan
Write-Host "  - Username: testuser"
Write-Host "  - Password: test123"
Write-Host "`nTo start all services, run:" -ForegroundColor Cyan
Write-Host "  docker-compose up -d"
Write-Host "`nTo view logs, run:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f"
