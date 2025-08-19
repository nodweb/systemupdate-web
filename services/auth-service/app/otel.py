import os
from typing import Optional

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import \
  OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def init_tracing(
    service_name: str = "auth-service", app: Optional[object] = None
) -> None:
    """
    Initialize OpenTelemetry tracing with OTLP exporter if env is set.

    Env controls:
    - OTEL_EXPORTER_OTLP_ENDPOINT (e.g. http://otel-collector:4317)
    - OTEL_SERVICE_NAME (optional, overrides service_name)
    - OTEL_TRACES_ENABLE ("1" to enable; default enabled if endpoint present)
    """
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    enable = os.getenv("OTEL_TRACES_ENABLE") == "1" or bool(endpoint)
    if not enable:
        return

    name = os.getenv("OTEL_SERVICE_NAME", service_name)
    resource = Resource.create({"service.name": name})

    provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(provider)

    if endpoint:
        exporter = OTLPSpanExporter(
            endpoint=endpoint, insecure=endpoint.startswith("http://")
        )
        provider.add_span_processor(BatchSpanProcessor(exporter))

    # If a FastAPI app instance is passed, instrument it
    if app is not None:
        FastAPIInstrumentor.instrument_app(app)
