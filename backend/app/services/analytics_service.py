from app.models.device import Device
from app.models.data_collection import DataCollection
from app.models.command import Command
from app import db
from sqlalchemy import func
from datetime import datetime, timedelta

class AnalyticsService:
    """Service for analytics and reporting logic"""

    def get_device_activity(self, start_date, end_date):
        # تعداد دستگاه‌های فعال در هر روز
        days = (end_date - start_date).days + 1
        activity = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            count = Device.query.filter(
                Device.last_seen >= day,
                Device.last_seen < day + timedelta(days=1)
            ).count()
            activity.append({
                'date': day.strftime('%Y-%m-%d'),
                'active_devices': count
            })
        return activity

    def get_data_collection_trends(self, start_date, end_date, data_type=None):
        # روند جمع‌آوری داده بر اساس نوع داده
        days = (end_date - start_date).days + 1
        trends = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            query = DataCollection.query.filter(
                DataCollection.created_at >= day,
                DataCollection.created_at < day + timedelta(days=1)
            )
            if data_type:
                query = query.filter_by(data_type=data_type)
            count = query.count()
            trends.append({
                'date': day.strftime('%Y-%m-%d'),
                'count': count
            })
        return trends

    def get_command_execution_trends(self, start_date, end_date, command_type=None):
        # روند اجرای دستورات
        days = (end_date - start_date).days + 1
        trends = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            query = Command.query.filter(
                Command.created_at >= day,
                Command.created_at < day + timedelta(days=1)
            )
            if command_type:
                query = query.filter_by(command_type=command_type)
            count = query.count()
            trends.append({
                'date': day.strftime('%Y-%m-%d'),
                'count': count
            })
        return trends

    def get_android_version_distribution(self):
        result = db.session.query(Device.android_version, func.count(Device.id)).group_by(Device.android_version).all()
        return {version: count for version, count in result}

    def get_manufacturer_distribution(self):
        result = db.session.query(Device.manufacturer, func.count(Device.id)).group_by(Device.manufacturer).all()
        return {manufacturer: count for manufacturer, count in result}

    def get_security_level_distribution(self):
        result = db.session.query(Device.security_level, func.count(Device.id)).group_by(Device.security_level).all()
        return {level: count for level, count in result}

    def get_data_type_distribution(self, start_date, end_date):
        result = db.session.query(
            DataCollection.data_type, func.count(DataCollection.id)
        ).filter(
            DataCollection.created_at >= start_date,
            DataCollection.created_at <= end_date
        ).group_by(DataCollection.data_type).all()
        return {data_type: count for data_type, count in result}

    def get_data_volume_statistics(self, start_date, end_date):
        # حجم داده جمع‌آوری شده در بازه زمانی
        result = db.session.query(
            func.sum(DataCollection.data_size)
        ).filter(
            DataCollection.created_at >= start_date,
            DataCollection.created_at <= end_date
        ).scalar()
        return {'total_data_volume': int(result) if result else 0}

    def get_data_collection_success_rates(self, start_date, end_date):
        total = DataCollection.query.filter(
            DataCollection.created_at >= start_date,
            DataCollection.created_at <= end_date
        ).count()
        processed = DataCollection.query.filter(
            DataCollection.created_at >= start_date,
            DataCollection.created_at <= end_date,
            DataCollection.status == 'processed'
        ).count()
        failed = DataCollection.query.filter(
            DataCollection.created_at >= start_date,
            DataCollection.created_at <= end_date,
            DataCollection.status == 'failed'
        ).count()
        return {
            'total': total,
            'processed': processed,
            'failed': failed,
            'success_rate': (processed / total * 100) if total > 0 else 0
        }

    def get_device_data_patterns(self, start_date, end_date):
        # الگوهای جمع‌آوری داده برای هر دستگاه
        result = db.session.query(
            DataCollection.device_id, func.count(DataCollection.id)
        ).filter(
            DataCollection.created_at >= start_date,
            DataCollection.created_at <= end_date
        ).group_by(DataCollection.device_id).all()
        return [{'device_id': device_id, 'count': count} for device_id, count in result]

    def get_command_type_distribution(self, start_date, end_date):
        result = db.session.query(
            Command.command_type, func.count(Command.id)
        ).filter(
            Command.created_at >= start_date,
            Command.created_at <= end_date
        ).group_by(Command.command_type).all()
        return {command_type: count for command_type, count in result}

    def get_command_success_rates(self, start_date, end_date):
        total = Command.query.filter(
            Command.created_at >= start_date,
            Command.created_at <= end_date
        ).count()
        completed = Command.query.filter(
            Command.created_at >= start_date,
            Command.created_at <= end_date,
            Command.status == 'completed'
        ).count()
        failed = Command.query.filter(
            Command.created_at >= start_date,
            Command.created_at <= end_date,
            Command.status == 'failed'
        ).count()
        return {
            'total': total,
            'completed': completed,
            'failed': failed,
            'success_rate': (completed / total * 100) if total > 0 else 0
        }

    def get_command_execution_times(self, start_date, end_date):
        result = db.session.query(
            func.avg(Command.execution_time)
        ).filter(
            Command.created_at >= start_date,
            Command.created_at <= end_date,
            Command.execution_time.isnot(None)
        ).scalar()
        return {'average_execution_time': float(result) if result else 0}

    def get_device_command_patterns(self, start_date, end_date):
        result = db.session.query(
            Command.device_id, func.count(Command.id)
        ).filter(
            Command.created_at >= start_date,
            Command.created_at <= end_date
        ).group_by(Command.device_id).all()
        return [{'device_id': device_id, 'count': count} for device_id, count in result]

    def get_security_statistics(self):
        # آمار امنیتی (مثلاً تعداد دستگاه‌های روت شده، دارای بیومتریک و ...)
        total = Device.query.count()
        rooted = Device.query.filter_by(is_rooted=True).count()
        biometric = Device.query.filter_by(has_biometric=True).count()
        encrypted = Device.query.filter_by(is_encrypted=True).count()
        return {
            'total_devices': total,
            'rooted_devices': rooted,
            'biometric_devices': biometric,
            'encrypted_devices': encrypted
        }

    def get_security_incidents(self, start_date, end_date):
        # برای دمو: لیست خالی (در آینده می‌توان به گزارش‌های امنیتی متصل کرد)
        return []

    def get_device_security_levels(self):
        return self.get_security_level_distribution()

    def get_threat_analysis(self, start_date, end_date):
        # برای دمو: لیست خالی (در آینده می‌توان تحلیل تهدید را اضافه کرد)
        return []

    def get_compliance_status(self):
        # برای دمو: وضعیت فرضی (در آینده می‌توان به ماژول‌های compliance متصل کرد)
        return {'compliance': True, 'details': 'All devices compliant'}

    def generate_comprehensive_report(self, start_date, end_date):
        # برای دمو: گزارش ترکیبی از آمارها
        return {
            'device_stats': Device.get_device_stats(),
            'data_stats': DataCollection.get_collection_stats(),
            'command_stats': Command.get_command_stats()
        }

    def generate_security_report(self, start_date, end_date):
        return self.get_security_statistics()

    def generate_performance_report(self, start_date, end_date):
        return {
            'command_execution_times': self.get_command_execution_times(start_date, end_date),
            'data_volume': self.get_data_volume_statistics(start_date, end_date)
        }

    def export_data(self, export_type, data_types, start_date, end_date):
        # برای دمو: فقط یک خروجی فرضی برمی‌گرداند
        return {
            'export_id': 'demo-export-id',
            'download_url': '/api/exports/demo-export-id',
            'expires_at': (datetime.utcnow() + timedelta(hours=1)).isoformat()
        } 