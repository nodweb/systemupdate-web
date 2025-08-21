import httpx
import pytest
from app.main import app


@pytest.mark.asyncio
async def test_receive_alerts_smoke():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "alerts": [
                {
                    "status": "firing",
                    "labels": {
                        "alertname": "DemoHighLatency",
                        "severity": "warning",
                        "instance": "analytics",
                    },
                    "annotations": {"summary": "Latency above SLO"},
                },
                {
                    "status": "resolved",
                    "labels": {
                        "alertname": "DemoHighLatency",
                        "severity": "warning",
                        "instance": "analytics",
                    },
                    "annotations": {"summary": "Recovered"},
                },
            ]
        }
        resp = await ac.post("/alerts", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("received") == 2
    assert data.get("accepted") >= 1
