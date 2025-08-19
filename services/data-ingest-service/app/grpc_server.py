import asyncio
import json
import logging
import os
from typing import Optional

try:
    import grpc
    from grpc.aio import server as aio_server
except Exception:  # pragma: no cover
    grpc = None  # type: ignore
    aio_server = None  # type: ignore

LOGGER = logging.getLogger(__name__)

# We expect generated modules to be available on PYTHONPATH when enabled
INGEST_ENABLED = os.getenv("GRPC_INGEST_ENABLED", "false").lower() in {"1", "true", "yes"}
INGEST_BIND = os.getenv("GRPC_INGEST_BIND", "0.0.0.0:50051")


async def serve(handler_send):
    """
    Start a gRPC server exposing IngestService.Ingest.

    handler_send: async callable taking (device_id, kind, data_json) -> (accepted: bool, kafka_sent: bool, error: Optional[str])
    """
    if not INGEST_ENABLED:
        LOGGER.info("gRPC ingest disabled via GRPC_INGEST_ENABLED")
        return

    if grpc is None:
        LOGGER.warning("grpcio not installed; cannot start gRPC server")
        return

    try:
        from systemupdate.v1 import ingest_pb2 as pb2  # type: ignore
        from systemupdate.v1 import ingest_pb2_grpc as pb2_grpc  # type: ignore
    except Exception:
        try:
            import ingest_pb2 as pb2  # type: ignore
            import ingest_pb2_grpc as pb2_grpc  # type: ignore
        except Exception as e:  # pragma: no cover
            LOGGER.warning("gRPC stubs not importable: %s; skipping gRPC server", e)
            return

    class IngestService(pb2_grpc.IngestServiceServicer):  # type: ignore
        async def Ingest(self, request, context):  # type: ignore
            device_id = request.device_id
            kind = request.kind
            data_json = request.data_json
            accepted, kafka_sent, error = await handler_send(device_id, kind, data_json)
            return pb2.IngestResponse(accepted=accepted, kafka_sent=kafka_sent, error=error or "")

    s = aio_server(options=[("grpc.max_send_message_length", -1), ("grpc.max_receive_message_length", -1)])
    pb2_grpc.add_IngestServiceServicer_to_server(IngestService(), s)  # type: ignore
    s.add_insecure_port(INGEST_BIND)
    LOGGER.info("Starting gRPC ingest server on %s", INGEST_BIND)
    await s.start()
    await s.wait_for_termination()
