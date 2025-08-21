import os

import pytest

pytestmark = pytest.mark.docker

try:
    import websockets  # type: ignore
except Exception:  # pragma: no cover
    websockets = None


@pytest.mark.docker
@pytest.mark.timeout(5)
@pytest.mark.skipif(websockets is None, reason="websockets client not installed")
def test_websocket_connect_optional_token():
    token = os.getenv("WS_HUB_SMOKE_TOKEN")
    if not token:
        pytest.skip("WS_HUB_SMOKE_TOKEN not set; skipping ws connect smoke test")

    cid = os.getenv("WS_HUB_SMOKE_CLIENT_ID", "smoke-client")
    url = f"ws://localhost:8002/ws?token={token}&cid={cid}"

    async def _run():
        # Establish a short-lived connection and close
        async with websockets.connect(url, close_timeout=1) as ws:
            await ws.close()

    import asyncio

    asyncio.get_event_loop().run_until_complete(_run())
