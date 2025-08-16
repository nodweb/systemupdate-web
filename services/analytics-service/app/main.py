from fastapi import FastAPI

app = FastAPI(title="Analytics Service", version="0.1.0")

# OpenTelemetry initialization (no-op if not configured via env)
try:
    from .otel import init_tracing

    init_tracing(service_name="analytics-service", app=app)
except Exception:
    # Do not fail service if observability is misconfigured in dev
    pass


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
