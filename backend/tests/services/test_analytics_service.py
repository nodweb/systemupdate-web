import pytest
from datetime import datetime, timedelta
from app import db
from app.models.device import Device
from app.models.data_collection import DataCollection
from app.models.command import Command
from app.services.analytics_service import AnalyticsService

@pytest.fixture
def analytics_service():
    return AnalyticsService()

@pytest.fixture
def sample_data(app):
    with app.app_context():
        now = datetime.utcnow()
        
        # Create test devices
        d1 = Device(device_id='dev1', manufacturer='Samsung', android_version='11', security_level='high', last_seen=now)
        d2 = Device(device_id='dev2', manufacturer='Xiaomi', android_version='10', security_level='medium', last_seen=now)
        db.session.add_all([d1, d2])
        db.session.commit()
        
        # Create test data collections
        dc1 = DataCollection(device_id=d1.id, data_type='sms', data_size=100, status='processed', created_at=now - timedelta(days=1))
        dc2 = DataCollection(device_id=d1.id, data_type='contacts', data_size=200, status='failed', created_at=now)
        dc3 = DataCollection(device_id=d2.id, data_type='sms', data_size=150, status='processed', created_at=now)
        db.session.add_all([dc1, dc2, dc3])
        
        # Create test commands
        c1 = Command(device_id=d1.id, command_type='collect_sms', status='completed', created_at=now - timedelta(days=1), execution_time=2.5)
        c2 = Command(device_id=d2.id, command_type='collect_contacts', status='failed', created_at=now, execution_time=3.0)
        db.session.add_all([c1, c2])
        db.session.commit()
        
        return {'devices': [d1, d2], 'data_collections': [dc1, dc2, dc3], 'commands': [c1, c2]}

def test_get_device_activity(analytics_service, sample_data, app):
    with app.app_context():
        now = datetime.utcnow()
        start = now - timedelta(days=2)
        end = now
        activity = analytics_service.get_device_activity(start, end)
        assert isinstance(activity, list)
        assert all('date' in a and 'active_devices' in a for a in activity)

def test_get_data_collection_trends(analytics_service, sample_data, app):
    with app.app_context():
        now = datetime.utcnow()
        start = now - timedelta(days=2)
        end = now
        trends = analytics_service.get_data_collection_trends(start, end)
        assert isinstance(trends, list)
        assert all('date' in t and 'count' in t for t in trends)

def test_get_command_execution_trends(analytics_service, sample_data, app):
    with app.app_context():
        now = datetime.utcnow()
        start = now - timedelta(days=2)
        end = now
        trends = analytics_service.get_command_execution_trends(start, end)
        assert isinstance(trends, list)
        assert all('date' in t and 'count' in t for t in trends)

def test_get_android_version_distribution(analytics_service, sample_data, app):
    with app.app_context():
        dist = analytics_service.get_android_version_distribution()
        assert dist['11'] == 1
        assert dist['10'] == 1

def test_get_data_type_distribution(analytics_service, sample_data, app):
    with app.app_context():
        now = datetime.utcnow()
        start = now - timedelta(days=2)
        end = now
        dist = analytics_service.get_data_type_distribution(start, end)
        assert 'sms' in dist
        assert 'contacts' in dist

def test_get_data_volume_statistics(analytics_service, sample_data, app):
    with app.app_context():
        now = datetime.utcnow()
        start = now - timedelta(days=2)
        end = now
        stats = analytics_service.get_data_volume_statistics(start, end)
        assert 'total_data_volume' in stats
        assert stats['total_data_volume'] > 0

def test_get_data_collection_success_rates(analytics_service, sample_data, app):
    with app.app_context():
        now = datetime.utcnow()
        start = now - timedelta(days=2)
        end = now
        rates = analytics_service.get_data_collection_success_rates(start, end)
        assert 'total' in rates
        assert 'processed' in rates
        assert 'failed' in rates
        assert 'success_rate' in rates

def test_get_command_success_rates(analytics_service, sample_data, app):
    with app.app_context():
        now = datetime.utcnow()
        start = now - timedelta(days=2)
        end = now
        rates = analytics_service.get_command_success_rates(start, end)
        assert 'total' in rates
        assert 'completed' in rates
        assert 'failed' in rates
        assert 'success_rate' in rates

def test_get_command_execution_times(analytics_service, sample_data, app):
    with app.app_context():
        now = datetime.utcnow()
        start = now - timedelta(days=2)
        end = now
        times = analytics_service.get_command_execution_times(start, end)
        assert 'average_execution_time' in times 