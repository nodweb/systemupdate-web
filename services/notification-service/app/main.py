import logging
import os
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("notification-service")

app = FastAPI(title="notification-service", version="0.2.0")

# Throttling config (in-memory sliding window per (alertname, source))
THROTTLE_WINDOW_SECONDS = int(os.getenv("NOTIF_THROTTLE_WINDOW_SECONDS", "60"))
THROTTLE_LIMIT = int(os.getenv("NOTIF_THROTTLE_LIMIT", "20"))
_buckets: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)


def _key_for_alert(labels: Dict) -> Tuple[str, str]:
    name = str(labels.get("alertname") or "unknown")
    source = str(labels.get("instance") or labels.get("service_name") or "unknown")
    return name, source


def _allow_through(labels: Dict) -> bool:
    now = time.time()
    key = _key_for_alert(labels)
    dq = _buckets[key]
    # drop old timestamps outside the window
    cutoff = now - THROTTLE_WINDOW_SECONDS
    while dq and dq[0] < cutoff:
        dq.popleft()
    if len(dq) >= THROTTLE_LIMIT:
        return False
    dq.append(now)
    return True


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/alerts")
async def receive_alerts(request: Request):
    payload = await request.json()
    alerts = payload.get("alerts", [])

    accepted = 0
    throttled = 0
    for a in alerts:
        status = a.get("status")
        labels = a.get("labels", {})
        annotations = a.get("annotations", {})
        if _allow_through(labels):
            accepted += 1
            logger.info(
                "ALERT %s name=%s severity=%s source=%s summary=%s",
                status,
                labels.get("alertname"),
                labels.get("severity"),
                labels.get("instance") or labels.get("service_name"),
                annotations.get("summary"),
            )
        else:
            throttled += 1
            logger.warning(
                "THROTTLED alert name=%s source=%s (limit=%d/%ds)",
                labels.get("alertname"),
                labels.get("instance") or labels.get("service_name"),
                THROTTLE_LIMIT,
                THROTTLE_WINDOW_SECONDS,
            )
    return JSONResponse({"received": len(alerts), "accepted": accepted, "throttled": throttled})
