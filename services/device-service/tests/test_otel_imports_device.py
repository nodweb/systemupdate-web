import importlib


def test_otel_imports_contract_smoke():
    api = importlib.import_module("opentelemetry")
    sdk = importlib.import_module("opentelemetry.sdk")
    fastapi_instr = importlib.import_module("opentelemetry.instrumentation.fastapi")
    otlp = importlib.import_module(
        "opentelemetry.exporter.otlp.proto.grpc.trace_exporter"
    )

    assert api and sdk and fastapi_instr and otlp
