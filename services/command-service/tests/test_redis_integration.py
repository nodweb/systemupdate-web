import os

import pytest

try:
    import docker  # type: ignore
    import redis
    from testcontainers.redis import RedisContainer  # type: ignore

    _DOCKER_CLIENT = docker.from_env()
    _DOCKER_AVAILABLE = True
    try:
        _DOCKER_CLIENT.ping()
    except Exception:
        _DOCKER_AVAILABLE = False
except Exception:
    _DOCKER_AVAILABLE = False

skip_reason = "Docker/Testcontainers not available on this runner"
skip_if_no_docker = pytest.mark.skipif(
    not _DOCKER_AVAILABLE or os.environ.get("DOCKER_AVAILABLE") == "0",
    reason=skip_reason,
)


@skip_if_no_docker
@pytest.mark.asyncio
async def test_redis_ping_with_testcontainers():
    # Spin up ephemeral Redis and verify we can PING
    with RedisContainer("redis:7-alpine") as redis_container:
        host = redis_container.get_container_host_ip()
        port = redis_container.get_exposed_port(6379)
        client = redis.Redis(host=host, port=int(port), decode_responses=True)
        pong = client.ping()
        assert pong is True
