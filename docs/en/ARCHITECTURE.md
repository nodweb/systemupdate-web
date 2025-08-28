# Architecture

- Backend: Flask + Flask-SocketIO, PostgreSQL, Redis. Outbox pattern (`backend/app/services/command_service.py`).
- Frontend: React 18 + TypeScript + Vite + Socket.IO client.
- Android: Kotlin, Clean Architecture, Hilt DI, BuildConfig-based config, Certificate Pinning.

Key flows:
- Commands persisted, outbox emits events: `command.created`, `command.completed`, legacy `command_result`.
- WebSocket used for real-time dashboard updates.

See also: `SystemUpdate/docs/ARCHITECTURE.md` and `SystemUpdate/docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md`.
