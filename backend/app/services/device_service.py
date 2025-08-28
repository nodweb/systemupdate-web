from app.models.device import Device
from app import db
from sqlalchemy import func
from datetime import datetime, timedelta

class DeviceService:
    """Service for device-related business logic"""

    def get_all_devices(self):
        return Device.query.all()

    def get_device_by_id(self, device_id: int):
        # database primary key id
        return Device.query.get(device_id)

    def get_active_devices(self):
        cutoff = datetime.utcnow() - timedelta(hours=1)
        return Device.query.filter(Device.last_seen >= cutoff).all()

    def get_devices_by_manufacturer(self, manufacturer: str):
        return Device.query.filter_by(manufacturer=manufacturer).all()

    def get_devices_by_android_version(self, version: str):
        return Device.query.filter_by(android_version=version).all()

    def update_device_status(self, device_id: int, new_status: str):
        device = Device.query.get(device_id)
        if not device:
            return None
        # assume Device has a 'status' attribute used by tests
        device.status = new_status
        db.session.commit()
        return device

    def get_device_statistics(self, device_id: int | None = None):
        """If device_id is provided, return per-device stats; otherwise aggregate statistics."""
        if device_id is None:
            cutoff = datetime.utcnow() - timedelta(hours=1)
            total = db.session.query(func.count(Device.id)).scalar() or 0
            active = db.session.query(func.count(Device.id)).filter(Device.last_seen >= cutoff).scalar() or 0
            manufacturers = self.get_manufacturer_distribution()
            return {
                'total_devices': total,
                'active_devices': active,
                'manufacturers': manufacturers,
            }

        device = Device.query.get(device_id)
        if not device:
            return {}
        # Example: return last 7 days connection history, battery, etc.
        stats = {
            'last_seen': device.last_seen.isoformat() if device.last_seen else None,
            'connection_history': self.get_connection_history(device_id),
            'battery_level': getattr(device, 'battery_level', None),
            'is_charging': getattr(device, 'is_charging', None),
            'memory_usage': getattr(device, 'memory_usage', None),
            'cpu_usage': getattr(device, 'cpu_usage', None),
        }
        return stats

    def get_android_version_distribution(self):
        result = db.session.query(Device.android_version, func.count(Device.id)).group_by(Device.android_version).all()
        return {version: count for version, count in result}

    def get_manufacturer_distribution(self):
        result = db.session.query(Device.manufacturer, func.count(Device.id)).group_by(Device.manufacturer).all()
        return {manufacturer: count for manufacturer, count in result}

    def get_security_level_distribution(self):
        result = db.session.query(Device.security_level, func.count(Device.id)).group_by(Device.security_level).all()
        return {level: count for level, count in result}

    def get_connection_history(self, device_id=None, days=7):
        # For demo: return dummy data (should be replaced with real connection logs)
        now = datetime.utcnow()
        history = []
        for i in range(days):
            day = now - timedelta(days=i)
            history.append({
                'date': day.strftime('%Y-%m-%d'),
                'connected': True if i % 2 == 0 else False
            })
        return list(reversed(history)) 