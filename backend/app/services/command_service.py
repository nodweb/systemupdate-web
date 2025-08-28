from app import db, socketio
from app.models.command import Command
from app.models.outbox import OutboxEvent
from typing import Dict, Any
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class CommandService:
    """Minimal command service placeholder for Phase 1."""

    def create_command(self, device_id: int, command_type: str, command_data: Dict[str, Any] | None, priority: str = "normal") -> Command:
        cmd = Command(
            device_id=device_id,
            command_type=command_type,
            command_data=(json.dumps(command_data) if isinstance(command_data, dict) else command_data) or '{}',
            priority=priority,
            status='pending'
        )
        db.session.add(cmd)
        db.session.flush()  # get cmd.id before commit

        # Outbox event for command created
        payload = {
            'command_id': cmd.id,
            'device_id': device_id,
            'command_type': command_type,
            'payload': command_data or {},
        }
        outbox = OutboxEvent(
            aggregate_id=str(cmd.id),
            event_type='command.created',
            payload=json.dumps(payload)
        )
        db.session.add(outbox)
        db.session.commit()

        # Best-effort immediate processing (can be moved to worker later)
        try:
            self.process_outbox_events()
        except Exception as e:
            # leave unprocessed for later retry
            logger.warning("process_outbox_events failed after create_command id=%s: %s", cmd.id, e)

        return cmd

    def mark_command_completed(self, command_id: int, result: str | None = None):
        cmd = Command.query.get(command_id)
        if not cmd:
            return None
        cmd.status = 'completed'
        cmd.result_data = result
        db.session.commit()

        # emit completion via outbox for consistency
        payload = {
            'command_id': cmd.id,
            'device_id': cmd.device_id,
            'status': 'completed',
            'result': result,
        }
        evt = OutboxEvent(
            aggregate_id=str(cmd.id),
            event_type='command.completed',
            payload=json.dumps(payload)
        )
        db.session.add(evt)
        db.session.commit()
        try:
            self.process_outbox_events()
        except Exception as e:
            logger.warning("process_outbox_events failed after mark_command_completed id=%s: %s", cmd.id if cmd else command_id, e)
        return cmd

    def process_outbox_events(self):
        """Process unprocessed outbox events by emitting to Socket.IO."""
        # use module-level logger
        # Attempt to lock rows to prevent double-processing under concurrency (ignored by SQLite)
        try:
            query = OutboxEvent.query.filter_by(processed=False).order_by(OutboxEvent.created_at.asc())
            if hasattr(query, "with_for_update"):
                query = query.with_for_update(skip_locked=True)
            pending = query.all()
        except Exception:
            # Fallback without locking
            pending = OutboxEvent.query.filter_by(processed=False).order_by(OutboxEvent.created_at.asc()).all()

        for evt in pending:
            try:
                data = json.loads(evt.payload) if evt.payload else {}
                # If device-specific, emit to device room; else broadcast
                room = data.get('device_id')
                socketio.emit(evt.event_type, data, room=room)
                # Back-compat: emit 'command_result' for frontend listeners
                if evt.event_type == 'command.completed':
                    socketio.emit('command_result', data, room=room)
                # Mark processed per-event to avoid rolling back others on failure
                evt.processed = True
                evt.processed_at = datetime.utcnow()
                db.session.commit()
                logger.info("Outbox event processed id=%s type=%s room=%s", evt.id, evt.event_type, room)
            except Exception as e:
                db.session.rollback()
                logger.error("Outbox event failed id=%s error=%s", getattr(evt, 'id', None), e)
                # Keep unprocessed for retry
                continue
