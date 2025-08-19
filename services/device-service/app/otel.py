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
    service_name: str = "device-service", app: Optional[object] = None
) -> None:
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

    if app is not None:
        FastAPIInstrumentor.instrument_app(app)
