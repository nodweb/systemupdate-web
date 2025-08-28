# Deployment Guide

This guide outlines how to deploy each component of the SystemUpdate system for production.

## Android APK

1. Build a release APK
   - Linux/macOS:
     ```bash
     ./gradlew assembleRelease
     ```
   - Windows (PowerShell):
     ```powershell
     .\gradlew assembleRelease
     ```
2. Sign the APK with your release key (if not using Play App Signing)
   - Configure signingConfig in `SystemUpdate/app/build.gradle.kts` or use Android Studio > Build > Generate Signed Bundle/APK.
3. Verify on multiple devices/emulators
   - Test connectivity to your production backend and command execution.

## Backend Deployment

1. Environment
   - Python 3.10+
   - Production database (e.g., PostgreSQL) if applicable
   - Set required environment variables (JWT secret, DB URL, CORS origins, etc.)
2. Run behind a reverse proxy with HTTPS/WSS
   - Example stack: Nginx (TLS termination) → Gunicorn/Uvicorn ASGI app
3. Example (Uvicorn + Nginx)
   - Start app
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
     ```
   - Nginx (snippet)
     ```nginx
     server {
       listen 443 ssl;
       server_name your.domain.com;

       ssl_certificate     /etc/letsencrypt/live/your.domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your.domain.com/privkey.pem;

       # HTTP API
       location /api/ {
         proxy_pass http://127.0.0.1:8000/api/;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
       }

       # WebSocket
       location /ws/ {
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection "upgrade";
         proxy_pass http://127.0.0.1:8000/ws/;
       }
     }
     ```

## Frontend Deployment

1. Build production bundle (in `SystemUpdate-Web/frontend`)
   - Node 18+ recommended
   - Configure `VITE_API_URL` in `.env.production`
   - Build:
     ```bash
     npm ci
     npm run build
     ```
2. Deploy the generated `dist/` to your hosting/CDN
   - Nginx static hosting example
     ```nginx
     server {
       listen 443 ssl;
       server_name dashboard.domain.com;

       ssl_certificate     /etc/letsencrypt/live/dashboard.domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/dashboard.domain.com/privkey.pem;

       root /var/www/systemupdate-frontend/dist;
       index index.html;

       location / {
         try_files $uri /index.html;
       }
     }
     ```

## Configuration Checklist

- Android
  - Release keystore configured
  - Proper backend URL and pinning values in `BuildConfig`
- Backend
  - HTTPS enabled, WebSocket route configured
  - CORS/CSRF policies set
  - Environment variables set securely
- Frontend
  - `VITE_API_URL` points to production API base
  - Reverse proxy serves SPA with history fallback

## Post-Deployment Verification

- Login works (JWT issuance/refresh)
- Device connects and appears online
- Phase 1 commands execute successfully
- Logs update in real-time via WebSocket
- No mixed-content warnings (HTTPS + WSS)
