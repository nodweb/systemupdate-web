import time
from functools import wraps
from flask import request, jsonify

# Simple in-memory rate limiter (per-process). For production, use Redis.
_BUCKETS = {}


def rate_limit(limit: int = 60, window: int = 60):
    """Limit requests per key within window seconds.
    Key is remote_addr + path + method.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            now = int(time.time())
            key = f"{request.remote_addr}:{request.endpoint}:{request.method}"
            bucket = _BUCKETS.get(key)
            if not bucket or now - bucket["start"] >= window:
                bucket = {"start": now, "count": 0}
            bucket["count"] += 1
            _BUCKETS[key] = bucket
            if bucket["count"] > limit:
                return jsonify({"error": "Too many requests"}), 429
            return f(*args, **kwargs)
        return wrapper
    return decorator
