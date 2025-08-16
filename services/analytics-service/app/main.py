from fastapi import FastAPI
import httpx

try:
    from opentelemetry import trace
    tracer = trace.get_tracer(__name__)
except Exception:
    class _Noop:
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False
    class _Tracer:
        def start_as_current_span(self, name):
            return _Noop()
    tracer = _Tracer()

app = FastAPI(title="Analytics Service", version="0.1.0")

# OpenTelemetry initialization (no-op if not configured via env)
try:
    from .otel import init_tracing
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

    init_tracing(service_name="analytics-service", app=app)
    try:
        HTTPXClientInstrumentor().instrument()
    except Exception:
        pass
except Exception:
    # Do not fail service if observability is misconfigured in dev
    pass


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/demo/e2e")
async def demo_e2e(device_id: str = "dev-001"):
    """
    Starts an end-to-end trace by calling command-service which calls device-service.
    """
    with tracer.start_as_current_span("analytics.demo_e2e"):
        url = "http://command-service:8004/demo/downstream"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url, params={"device_id": device_id})
            r.raise_for_status()
            data = r.json()
        return {"ok": True, "via": "command-service", "device": data}
