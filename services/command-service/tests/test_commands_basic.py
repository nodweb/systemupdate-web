import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_create_list_get_command():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        # create
        resp = await ac.post(
            "/commands",
            json={"device_id": "dev-xyz", "name": "reboot", "payload": {"force": True}},
        )
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
