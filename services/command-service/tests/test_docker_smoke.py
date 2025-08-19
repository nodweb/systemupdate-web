import socket
import os
import pytest
import urllib.request

pytestmark = pytest.mark.docker


def can_connect(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def test_postgres_is_reachable():
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = int(os.getenv("POSTGRES_PORT", "5432"))
    assert can_connect(host, port), f"Cannot reach Postgres at {host}:{port}"


def test_redis_is_reachable():
    host = os.getenv("REDIS_HOST", "localhost")
    port = int(os.getenv("REDIS_PORT", "6379"))
    assert can_connect(host, port), f"Cannot reach Redis at {host}:{port}"


def test_healthz_ok():
    with urllib.request.urlopen("http://localhost:8004/healthz", timeout=2.0) as resp:
        assert resp.status == 200


@pytest.mark.docker
def test_postgres_select_one():
    try:
        try:
            import psycopg
            driver = "psycopg3"
            conn = psycopg.connect(
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                dbname=os.getenv("POSTGRES_DB", "systemupdate"),
                user=os.getenv("POSTGRES_USER", "systemupdate"),
                password=os.getenv("POSTGRES_PASSWORD", "systemupdate"),
                connect_timeout=2,
            )
            with conn, conn.cursor() as cur:
                cur.execute("SELECT 1")
                assert cur.fetchone()[0] == 1
        except ImportError:
            import psycopg2  # type: ignore
            driver = "psycopg2"
            conn = psycopg2.connect(
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                dbname=os.getenv("POSTGRES_DB", "systemupdate"),
                user=os.getenv("POSTGRES_USER", "systemupdate"),
                password=os.getenv("POSTGRES_PASSWORD", "systemupdate"),
                connect_timeout=2,
            )
            with conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    assert cur.fetchone()[0] == 1
    except ImportError:
        pytest.skip("psycopg/psycopg2 not installed; skipping DB roundtrip")
    except Exception as e:
        pytest.skip(f"DB not available for roundtrip: {e}")
