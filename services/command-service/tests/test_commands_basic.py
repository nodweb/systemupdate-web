import pytest
from httpx import AsyncClient
from services.command-service.app.main import app  # type: ignore


@pytest.mark.asyncio
async def test_create_list_get_command():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # create
        resp = await ac.post("/commands", json={
            "device_id": "dev-xyz",
            "name": "reboot",
            "payload": {"force": True}
        })
        assert resp.status_code == 201
        created = resp.json()
        cid = created["id"]
        assert created["device_id"] == "dev-xyz"

        # list
        resp = await ac.get("/commands")
        assert resp.status_code == 200
        items = resp.json()
        assert any(i["id"] == cid for i in items)

        # get
        resp = await ac.get(f"/commands/{cid}")
        assert resp.status_code == 200
        one = resp.json()
        assert one["id"] == cid
