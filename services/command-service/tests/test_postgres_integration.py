import os
import pytest

try:
    import docker  # type: ignore
    from testcontainers.postgres import PostgresContainer  # type: ignore
    import psycopg
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
async def test_postgres_connect_and_query_version():
    with PostgresContainer("postgres:16-alpine") as pg:
        conn_str = pg.get_connection_url()
        # psycopg3 accepts a connection string
        with psycopg.connect(conn_str) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                row = cur.fetchone()
                assert row and "PostgreSQL" in row[0]
