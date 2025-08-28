from flask_socketio import join_room, emit
from flask import request, current_app
from datetime import datetime
from app import db
from app.models.device import Device
from app.models.command import Command
import logging
import jwt
import hashlib

logger = logging.getLogger(__name__)

# Track authenticated sessions: sid -> device_id
AUTH_SESSIONS = {}


def _authenticate_token(token):
    try:
        secret = current_app.config.get('JWT_SECRET_KEY')
        # Temporary debug: log masked fingerprint and length (no secret exposure)
        if secret:
            fp = hashlib.sha256(secret.encode('utf-8')).hexdigest()[:10]
            logger.info(f"JWT secret fp={fp} len={len(secret)}")
        decoded = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        logger.info(f"WS auth decoded token: keys={list(decoded.keys())}")
        device_id = decoded.get('sub') or decoded.get('device_id')
        if not device_id:
            logger.warning("WS auth failed: no device_id in token claims")
            return None, "no device_id in token claims"
        device = Device.query.filter_by(device_id=device_id).first()
        # Auto-provision device if not present
        if not device:
            device = Device(device_id=device_id, is_connected=False)
            db.session.add(device)
            db.session.commit()
        return device, None
    except Exception as e:
        logger.warning(f'WebSocket auth failed: {e}')
        return None, str(e)


def _get_device_id_from_sid(sid):
    return AUTH_SESSIONS.get(sid)


def register_socketio_events(sio):
    @sio.on('connect')
    def handle_connect():
        logger.info(f'Client connected: {request.sid}')
        emit('connected', {'message': 'WebSocket connection established'})

    @sio.on('authenticate')
    def handle_authenticate(data):
        token = (data or {}).get('token')
        sid = request.sid
        device, err = _authenticate_token(token)
        if device:
            AUTH_SESSIONS[sid] = device.device_id
            join_room(device.device_id)
            device.is_connected = True
            device.last_seen = datetime.utcnow()
            db.session.commit()
            emit('authenticated', {'device_id': device.device_id})
            logger.info(f'Device {device.device_id} authenticated and joined room')
        else:
            emit('auth_failed', {'error': 'Authentication failed', 'reason': err or 'unknown'})

    @sio.on('disconnect')
    def handle_disconnect():
        sid = request.sid
        device_id = AUTH_SESSIONS.pop(sid, None)
        logger.info(f'Client disconnected: {sid} (device: {device_id})')
        if device_id:
            device = Device.get_device_by_id(device_id)
            if device:
                device.mark_disconnected()
                db.session.commit()

    @sio.on('send_data')
    def handle_send_data(data):
        sid = request.sid
        device_id = _get_device_id_from_sid(sid)
        payload = (data or {}).get('payload')
        if not device_id or payload is None:
            emit('error', {'error': 'Invalid data'})
            return
        # Broadcast to dashboard clients
        emit('data_received', {'device_id': device_id, 'payload': payload}, broadcast=True)
        logger.info(f'Data received from device {device_id}')

    @sio.on('command_result')
    def handle_command_result(data):
        sid = request.sid
        device_id = _get_device_id_from_sid(sid)
        command_id = (data or {}).get('command_id')
        result = (data or {}).get('result')
        status = (data or {}).get('status') or 'completed'
        if not device_id or not command_id:
            emit('error', {'error': 'Invalid command result'})
            return
        # Update command status in DB
        command = Command.query.get(command_id)
        if command and str(command.device_id) == str(device_id):
            command.status = status
            if result is not None:
                # result_data is a JSON string field; let model store it as text
                import json as _json
                command.result_data = _json.dumps(result)
            command.completed_at = datetime.utcnow()
            db.session.commit()
        # Notify dashboard
        emit('command_result', {
            'device_id': device_id,
            'command_id': command_id,
            'status': status,
            'result': result
        }, broadcast=True)
        logger.info(f'Command result for device {device_id}, command {command_id}')

    @sio.on('heartbeat')
    def handle_heartbeat(data):
        sid = request.sid
        device_id = _get_device_id_from_sid(sid)
        if not device_id:
            emit('error', {'error': 'Not authenticated'})
            return
        device = Device.get_device_by_id(device_id)
        if device:
            status = data or {}
            device.update_status(status)
            db.session.commit()
            emit('heartbeat_ack', {'ts': datetime.utcnow().isoformat()})