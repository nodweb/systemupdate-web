import pytest
from datetime import datetime, timedelta
from app import db
from app.models.device import Device
from app.services.device_service import DeviceService

@pytest.fixture
def device_service():
    return DeviceService()

@pytest.fixture
def sample_devices(app):
    with app.app_context():
        now = datetime.utcnow()
        
        # Create test devices
        d1 = Device(device_id='dev1', manufacturer='Samsung', android_version='11', security_level='high', last_seen=now)
        d2 = Device(device_id='dev2', manufacturer='Xiaomi', android_version='10', security_level='medium', last_seen=now)
        d3 = Device(device_id='dev3', manufacturer='Huawei', android_version='9', security_level='low', last_seen=now - timedelta(days=1))
        
        db.session.add_all([d1, d2, d3])
        db.session.commit()
        
        return [d1, d2, d3]

def test_get_all_devices(device_service, sample_devices, app):
    with app.app_context():
        devices = device_service.get_all_devices()
        assert len(devices) == 3
        assert all(isinstance(d, Device) for d in devices)

def test_get_device_by_id(device_service, sample_devices, app):
    with app.app_context():
        # Avoid accessing attributes on detached fixture instance; re-query by device_id
        pk = Device.query.filter_by(device_id='dev1').first().id
        device = device_service.get_device_by_id(pk)
        assert device is not None
        assert device.device_id == 'dev1'
        assert device.manufacturer == 'Samsung'

def test_get_active_devices(device_service, sample_devices, app):
    with app.app_context():
        active_devices = device_service.get_active_devices()
        assert len(active_devices) == 2  # Only 2 devices are active (last_seen is recent)
        assert all(d.last_seen >= datetime.utcnow() - timedelta(hours=1) for d in active_devices)

def test_get_devices_by_manufacturer(device_service, sample_devices, app):
    with app.app_context():
        samsung_devices = device_service.get_devices_by_manufacturer('Samsung')
        assert len(samsung_devices) == 1
        assert samsung_devices[0].manufacturer == 'Samsung'

def test_get_devices_by_android_version(device_service, sample_devices, app):
    with app.app_context():
        android_11_devices = device_service.get_devices_by_android_version('11')
        assert len(android_11_devices) == 1
        assert android_11_devices[0].android_version == '11'

def test_update_device_status(device_service, sample_devices, app):
    with app.app_context():
        # Re-query to get a session-bound instance
        device = Device.query.filter_by(device_id='dev1').first()
        new_status = 'offline'
        updated_device = device_service.update_device_status(device.id, new_status)
        assert updated_device.status == new_status

def test_get_device_statistics(device_service, sample_devices, app):
    with app.app_context():
        stats = device_service.get_device_statistics()
        assert 'total_devices' in stats
        assert 'active_devices' in stats
        assert 'manufacturers' in stats
        assert stats['total_devices'] == 3
        assert stats['active_devices'] == 2 