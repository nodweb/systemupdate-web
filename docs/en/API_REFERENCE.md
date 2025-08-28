# API Reference (Summary)

- GET /health → {"status":"ok"}
- WebSocket events:
  - command.created: { command_id, device_id, command }
  - command.completed: { command_id, device_id, result }
  - command_result (legacy): { command_id, device_id, result }

More examples: see `SystemUpdate/docs/API.md` and `SystemUpdate/docs/API_EXAMPLES.md`.
