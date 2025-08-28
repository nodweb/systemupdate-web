# WebSocket (Socket.IO) Integration Test Results

Date: 2025-08-23

## Setup
- Backend entrypoint: `SystemUpdate-Web/backend/run.py`
- Required env vars (development):
  - `SECRET_KEY=dev-secret-key-2024`
  - `JWT_SECRET_KEY=dev-jwt-secret-key-2024`
  - (Optional) `FLASK_DEBUG=true`, `FLASK_HOST=0.0.0.0`, `FLASK_PORT=5001`

## How to Run
```powershell
# 1) In a terminal
cd SystemUpdate-Web/backend
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
$env:SECRET_KEY='dev-secret-key-2024'; $env:JWT_SECRET_KEY='dev-jwt-secret-key-2024'; $env:FLASK_PORT='5001'
python run.py

# 2) In a second terminal, run the test client
cd SystemUpdate-Web
$env:BACKEND_URL='http://localhost:5001'; $env:JWT_SECRET_KEY='dev-jwt-secret-key-2024'; $env:DEVICE_ID='test-device-001'
python scripts/test_socketio_integration.py
```

## Observations
- Connection: SUCCESS (polling upgraded to WebSocket)
- Authentication: SUCCESS using HS256 device JWT signed with `JWT_SECRET_KEY`
- Heartbeat ACK: SUCCESS (received `heartbeat_ack` with ISO timestamp)
- Command delivery → result ack: NOT TESTED in this run (client emits `command_result` when it receives a `command` event)

## Notes
- Verify JWT secret fingerprint matches between server and client before running:
  ```powershell
  # Client fingerprint
  $sec = $env:JWT_SECRET_KEY
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($sec)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $hash = $sha.ComputeHash($bytes)
  $fp = ([System.BitConverter]::ToString($hash)).Replace('-','').ToLower().Substring(0,10)
  "client fp=$fp len=$($sec.Length)"
  ```
  The backend logs a masked fingerprint on startup during Socket.IO auth initialization.
- For manual testing with `wscat`, remember Flask-SocketIO uses the Socket.IO protocol, not raw WS frames. Prefer a Socket.IO client (like the provided Python script) or use `socket.io-client` tooling.
- Device JWT must include `sub`, `type=device` and be signed with `JWT_SECRET_KEY`.
- Python client requires `aiohttp` in the virtualenv.
- On first successful authentication, the backend will auto-provision a `Device` record if it does not exist and join a room named after `device_id`.

---

## Frontend Integration Results (to be filled during E2E)

### DeviceDetails CommandPanel
- [ ] GET_SMS works and returns payload
- [ ] GET_CONTACTS works and returns payload
- [ ] GET_INSTALLED_APPS works and returns payload
- [ ] GET_FILES works with path input
- [ ] SEND_SMS sends with number/message
- [ ] Success snackbar appears
- [ ] Logs auto-refresh after command
- [ ] Command results shown in info alert

### RemoteControl Integration
- [ ] New tab "دستورات سیستم" visible
- [ ] Commands execute successfully
- [ ] Route params `/remote/:deviceId` working

### Performance Metrics
- Command execution: ____ seconds
- WebSocket latency: ____ ms
- UI responsiveness: ____
