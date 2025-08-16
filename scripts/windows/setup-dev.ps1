<#
.SYNOPSIS
  SystemUpdate-Web Windows Dev Setup (WSL2 + Docker + Python)

.DESCRIPTION
  Idempotent setup script for Windows 10/11. It will:
  - Enable Windows features: VirtualMachinePlatform, Microsoft-Windows-Subsystem-Linux
  - Set WSL2 as default and optionally install Ubuntu
  - Install Python 3.12, Git, Docker Desktop via winget (if missing)
  - Start Docker Desktop and verify engine availability
  - Create isolated Python venv per service and install dependencies
  - Run pytest for each service

.NOTES
  - Run in an elevated PowerShell (Run as Administrator)
  - Some steps may require reboot; re-run after reboot
  - Safe to re-run; it checks current state before changing it

#>

param(
  [switch]$SkipUbuntuInstall,
  [string]$WslDistro = "Ubuntu",
  [switch]$SkipTests,
  [switch]$NoTests,
  [string]$Only,
  [string]$PythonVersion = "3.12"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Back-compat: map -NoTests to -SkipTests if provided
if ($NoTests) { $Script:SkipTests = $true }

function Write-Info($msg)  { Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "[ OK ]  $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[ERR ]  $msg" -ForegroundColor Red }

function Assert-Admin {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal] $currentIdentity
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "This script must be run as Administrator. Right-click PowerShell and 'Run as administrator'."
  }
}

function Ensure-Feature($name) {
  $feature = Get-WindowsOptionalFeature -Online -FeatureName $name -ErrorAction SilentlyContinue
  if (-not $feature) { throw "Feature $name not found" }
  if ($feature.State -ne 'Enabled') {
    Write-Info "Enabling Windows feature: $name"
    Enable-WindowsOptionalFeature -Online -FeatureName $name -All -NoRestart | Out-Null
    Write-Ok "Enabled $name (restart may be required)"
    return $true
  } else {
    Write-Ok "$name already enabled"
    return $false
  }
}

function Command-Exists($cmd) {
  $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Winget-InstallIfMissing($id, $source = 'winget') {
  if (-not (Command-Exists winget)) { throw "winget is not available. Update Microsoft Store App Installer." }
  $installed = winget list --id $id --source $source --accept-source-agreements 2>$null | Select-String $id -Quiet
  if (-not $installed) {
    Write-Info "Installing $id via winget"
    winget install --id $id --source $source --silent --accept-package-agreements --accept-source-agreements
    Write-Ok "Installed $id"
  } else {
    Write-Ok "$id already installed"
  }
}

function Ensure-WSL2 {
  $restartNeeded = $false
  $restartNeeded = (Ensure-Feature 'VirtualMachinePlatform') -or $restartNeeded
  $restartNeeded = (Ensure-Feature 'Microsoft-Windows-Subsystem-Linux') -or $restartNeeded

  try {
    wsl --set-default-version 2 | Out-Null
    Write-Ok "WSL default version set to 2"
  } catch { Write-Warn "Could not set WSL default version: $($_.Exception.Message)" }

  $distroInstalledNow = $false
  if (-not $SkipUbuntuInstall) {
    try {
      $distros = wsl -l -q 2>$null
      if (-not ($distros -match "^$WslDistro$")) {
        Write-Info "Installing WSL distro: $WslDistro"
        wsl --install -d $WslDistro
        Write-Ok "$WslDistro installation initiated (a reboot or first-run setup may be required)"
        $distroInstalledNow = $true
        $restartNeeded = $true
      } else {
        Write-Ok "$WslDistro already installed"
      }
    } catch { Write-Warn "WSL distro install check failed: $($_.Exception.Message)" }
  } else { Write-Info "Skipping Ubuntu install per flag" }

  return @{ RestartNeeded = $restartNeeded; DistroInstalledNow = $distroInstalledNow }
}

function Ensure-DockerDesktop {
  Winget-InstallIfMissing -id 'Docker.DockerDesktop'
  # Start Docker Desktop if not running
  $proc = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue
  if (-not $proc) {
    Write-Info "Starting Docker Desktop"
    Start-Process -FilePath "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe" -ArgumentList "--unattended" | Out-Null
    Start-Sleep -Seconds 5
  }
  # Wait for engine
  $maxWait = 120
  for ($i=0; $i -lt $maxWait; $i+=5) {
    try {
      if (Command-Exists docker) {
        docker version --format '{{.Server.Version}}' 2>$null | Out-Null
        Write-Ok "Docker engine is available"
        return
      }
    } catch {}
    Write-Info "Waiting for Docker engine... ($i/$maxWait sec)"
    Start-Sleep -Seconds 5
  }
  Write-Warn "Docker engine did not become ready in ${maxWait}s. You may need to open Docker Desktop manually."
}

function Ensure-Python([string]$version) {
  # Prefer 'py' launcher if present
  if (Command-Exists py) {
    try {
      $pyver = py -$version -c "import sys; print(sys.version)" 2>$null
      if ($LASTEXITCODE -eq 0) { Write-Ok "Python $version available via py launcher"; return }
    } catch {}
  }
  Winget-InstallIfMissing -id "Python.Python.$version"
}

function Ensure-Git { Winget-InstallIfMissing -id 'Git.Git' }

function New-VenvAndInstall($servicePath) {
  Push-Location $servicePath
  try {
    $venv = Join-Path $servicePath '.venv'
    if (-not (Test-Path $venv)) {
      Write-Info "Creating venv in $servicePath"
      if (Command-Exists py) { py -$PythonVersion -m venv .venv } else { python -m venv .venv }
      Write-Ok "venv created"
    } else { Write-Ok "venv already exists" }

    $pip = Join-Path $venv 'Scripts/pip.exe'
    $pytest = Join-Path $venv 'Scripts/pytest.exe'

    if (Test-Path (Join-Path $servicePath 'requirements.txt')) {
      Write-Info "Installing requirements for $(Split-Path -Leaf $servicePath)"
      & $pip install --upgrade pip wheel | Out-Null
      & $pip install -r requirements.txt
      Write-Ok "Dependencies installed"
    } else { Write-Warn "requirements.txt not found in $servicePath" }

    if (-not $SkipTests) {
      Write-Info "Running pytest for $(Split-Path -Leaf $servicePath)"
      $env:PYTHONPATH = '.'
      & $pytest -q
    }
  } finally { Pop-Location }
}

function Main {
  Assert-Admin

  Write-Info "Ensuring WSL2 features"
  $wsl = Ensure-WSL2
  if ($wsl.RestartNeeded) {
    Write-Warn "A restart or Ubuntu first-run setup is required before continuing."
    Write-Warn "After reboot/first-run completes, re-run this script with -SkipUbuntuInstall to continue:"
    Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`" -SkipUbuntuInstall -PythonVersion $PythonVersion" -ForegroundColor Yellow
    return
  }

  Write-Info "Ensuring Git / Python / Docker Desktop"
  Ensure-Git
  Ensure-Python -version $PythonVersion
  Ensure-DockerDesktop

  # Resolve repo root (this script is under scripts/windows)
  $scriptDir = $null
  if ($PSBoundParameters.ContainsKey('PSScriptRoot') -and $PSScriptRoot) {
    $scriptDir = $PSScriptRoot
  } elseif ($PSCommandPath) {
    $scriptDir = Split-Path -Parent -Path $PSCommandPath
  } elseif ($MyInvocation -and $MyInvocation.MyCommand -and ($MyInvocation.MyCommand | Get-Member -Name Path -ErrorAction SilentlyContinue)) {
    $scriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Path
  }
  if (-not $scriptDir) { throw "Unable to determine script directory. Please run via -File path to the script." }

  $repoRoot  = Resolve-Path (Join-Path $scriptDir '..\..\')

  $services = @(
    (Join-Path $repoRoot 'services\ws-hub')
    (Join-Path $repoRoot 'services\auth-service')
    (Join-Path $repoRoot 'services\device-service')
  )

  # If -Only is specified, filter services to run (supports comma-separated names)
  if ($Only) {
    $names = $Only -split ',' | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ }
    if ($names.Count -gt 0) {
      $services = $services | Where-Object { ($_.ToString() | Split-Path -Leaf).ToLower() -in $names }
      if (-not $services -or $services.Count -eq 0) {
        Write-Warn "No services matched -Only '$Only'"
        return
      }
    }
  }

  foreach ($svc in $services) {
    if (Test-Path $svc) { New-VenvAndInstall -servicePath $svc }
    else { Write-Warn "Service path not found: $svc" }
  }

  Write-Ok "Setup completed"
}

Main
