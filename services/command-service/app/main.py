from fastapi import FastAPI

app = FastAPI(title="Command Service", version="0.1.0")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/example/commands")
async def list_example_commands():
    return {
        "items": [
            {"id": "cmd-1", "device_id": "dev-001", "name": "reboot", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "cmd-2", "device_id": "dev-002", "name": "install_update", "created_at": "2024-01-02T00:00:00Z"},
        ]
    }
