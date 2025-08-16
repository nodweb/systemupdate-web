import json
import os
import asyncio
from typing import Any, Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

try:
    from aiokafka import AIOKafkaProducer
except Exception:  # pragma: no cover - aiokafka missing in some envs
    AIOKafkaProducer = None  # type: ignore

app = FastAPI(title="Data Ingest Service", version="0.2.0")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


class IngestBody(BaseModel):
    device_id: str = Field(..., min_length=1)
    kind: str = Field(..., min_length=1)
    data: Dict[str, Any]


producer = None
topic_default = os.getenv("INGEST_TOPIC", "device.ingest.raw")
bootstrap = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")


@app.on_event("startup")
async def on_startup():
    global producer
    if AIOKafkaProducer is None:
        return
    try:
        loop = asyncio.get_event_loop()
        producer = AIOKafkaProducer(bootstrap_servers=bootstrap, loop=loop)
        await producer.start()
    except Exception:
        producer = None


@app.on_event("shutdown")
async def on_shutdown():
    global producer
    try:
        if producer is not None:
            await producer.stop()
    finally:
        producer = None


@app.post("/ingest")
async def ingest(body: IngestBody):
    payload = {
        "device_id": body.device_id,
        "kind": body.kind,
        "data": body.data,
    }
    sent = False
    if producer is not None:
        try:
            await producer.send_and_wait(topic_default, json.dumps(payload).encode("utf-8"))
            sent = True
        except Exception:
            sent = False
    return {"accepted": True, "kafka_sent": sent}


@app.websocket("/ws/ingest")
async def ws_ingest(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_text()
            try:
                data = json.loads(msg)
                sent = False
                if producer is not None:
                    try:
                        await producer.send_and_wait(topic_default, json.dumps(data).encode("utf-8"))
                        sent = True
                    except Exception:
                        sent = False
                await ws.send_json({"accepted": True, "kafka_sent": sent})
            except Exception:
                await ws.send_json({"accepted": False, "error": "invalid json"})
    except WebSocketDisconnect:
        return
