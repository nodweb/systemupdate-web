from flask import Blueprint, jsonify
from datetime import datetime
from app import db, socketio

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok'
    }), 200

@health_bp.route('/health/detailed', methods=['GET'])
def health_detailed():
    """Detailed health with DB and WebSocket checks (best-effort)."""
    status = 'ok'
    components = {}

    # DB check
    try:
        db.session.execute('SELECT 1')
        components['database'] = 'healthy'
    except Exception as e:
        components['database'] = f'unhealthy: {e}'
        status = 'degraded'

    # WebSocket (best-effort: may vary by async mode)
    try:
        rooms = getattr(getattr(getattr(socketio, 'server', None), 'manager', None), 'rooms', {})
        ws_active = 0
        if isinstance(rooms, dict) and '/' in rooms:
            # rooms['/'] is dict of rooms; subtract special rooms if needed
            ws_active = sum(len(v) for k, v in rooms['/'].items() if isinstance(v, dict))
        components['websocket'] = {'active_connections': ws_active}
    except Exception:
        components['websocket'] = {'active_connections': None}

    return jsonify({
        'status': status,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'components': components,
    }), 200 if status == 'ok' else 503
