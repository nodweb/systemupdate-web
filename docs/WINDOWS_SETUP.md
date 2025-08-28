# Windows Development Setup (SystemUpdate-Web)

This guide helps you run the backend and frontend on Windows (PowerShell).

## Prerequisites
- Python 3.10+
- Node.js 18+
- Git

## 1) Backend: create venv & install deps
```powershell
# From repo root or backend folder
cd c:/Users/UC/AndroidStudioProjects/SystemUpdate-Web/backend
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

## 2) Backend: run with proper env
Required env vars:
- SECRET_KEY
- JWT_SECRET_KEY
- FLASK_PORT (default 5001)

```powershell
cd c:/Users/UC/AndroidStudioProjects/SystemUpdate-Web/backend
. .venv/Scripts/Activate.ps1
$env:SECRET_KEY = "dev-secret-key-2024"
$env:JWT_SECRET_KEY = "dev-jwt-secret-key-2024"
$env:FLASK_PORT = "5001"
python run.py
```

Notes:
- CORS is configured for Vite dev servers (5173/5174) under `/api/*` with proper headers.
- Socket.IO allows all origins for development.
- On startup, backend logs a masked fingerprint of `JWT_SECRET_KEY` to diagnose mismatches.

## 3) Frontend: run Vite dev server
```powershell
cd c:/Users/UC/AndroidStudioProjects/SystemUpdate-Web/frontend
# Optional: ensure API base is set
# echo "VITE_API_URL=http://localhost:5001/api" > .env.development.local
npm install
npm run dev
```
Open http://localhost:5173.

## 4) Environment variables quick reference
- Backend: `SECRET_KEY`, `JWT_SECRET_KEY`, `FLASK_PORT`
- Frontend: `VITE_API_URL` (e.g., `http://localhost:5001/api`)
- Socket.IO test: `BACKEND_URL`, `JWT_SECRET_KEY`, `DEVICE_ID`

## 5) Troubleshooting
- ModuleNotFoundError (e.g., `flasgger`): activate venv and `pip install -r requirements.txt`.
- CORS preflight blocked: ensure backend restarted after CORS changes; origin is `http://localhost:5173`.
- Socket.IO auth failed: compute JWT secret fingerprint client-side and compare with backend log.
```powershell
# Fingerprint in PowerShell
$sec = $env:JWT_SECRET_KEY
$bytes = [System.Text.Encoding]::UTF8.GetBytes($sec)
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = $sha.ComputeHash($bytes)
$fp = ([System.BitConverter]::ToString($hash)).Replace('-','').ToLower().Substring(0,10)
"client fp=$fp len=$($sec.Length)"
```
