import asyncio
import time

import pytest

pytestmark = [
    pytest.mark.performance,
    pytest.mark.skip(reason="performance test stub; requires running local service"),
]  # noqa: E501


async def test_concurrent_requests_stub():
    async def make_request(i):
        # Simulate request timing without external dependency
        start = time.time()
        await asyncio.sleep(0.001)
        return time.time() - start

    tasks = [make_request(i) for i in range(100)]
    durations = await asyncio.gather(*tasks)
    p95 = sorted(durations)[95]
    assert p95 < 0.05
