from typing import Any, Dict, Optional
from app import socketio

class NotificationService:
    """Encapsulates outbound notifications to dashboard and devices via Socket.IO.

    Phase 1: no emails/SMS/push; only in-app dashboard/websocket broadcasts.
    """

    def send_command_result(self, device_id: str, command_id: int, result: Dict[str, Any], status: str = "completed") -> None:
        payload = {
            "device_id": device_id,
            "command_id": command_id,
            "status": status,
            "result": result,
        }
        # Broadcast to all dashboard clients
        socketio.emit("command_result", payload, broadcast=True)

    def send_device_data(self, device_id: str, payload: Dict[str, Any]) -> None:
        socketio.emit("data_received", {"device_id": device_id, "payload": payload}, broadcast=True)

    def notify_device(self, device_id: str, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        # Target a specific device room (device_id string)
        socketio.emit(event, data or {}, room=device_id)
