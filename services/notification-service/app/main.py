from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("notification-service")

app = FastAPI(title="notification-service", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/alerts")
async def receive_alerts(request: Request):
    payload = await request.json()
    # Log a compact summary
    alerts = payload.get("alerts", [])
    for a in alerts:
        status = a.get("status")
        labels = a.get("labels", {})
        annotations = a.get("annotations", {})
        logger.info(
            "ALERT %s name=%s severity=%s instance=%s summary=%s",
            status,
            labels.get("alertname"),
            labels.get("severity"),
            labels.get("instance") or labels.get("service_name"),
            annotations.get("summary"),
        )
    return JSONResponse({"received": len(alerts)})
