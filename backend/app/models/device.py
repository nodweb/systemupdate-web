from app import db
from datetime import datetime
import json
from sqlalchemy import inspect as sa_inspect

class Device(db.Model):
    """Device model for storing Android device information"""
    __tablename__ = 'devices'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    device_name = db.Column(db.String(255))
    manufacturer = db.Column(db.String(255))
    model = db.Column(db.String(255))
    android_version = db.Column(db.String(50))
    sdk_version = db.Column(db.Integer)
    is_rooted = db.Column(db.Boolean, default=False)
    is_connected = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Security information
    security_level = db.Column(db.String(50), default='unknown')
    has_biometric = db.Column(db.Boolean, default=False)
    has_vpn = db.Column(db.Boolean, default=False)
    is_encrypted = db.Column(db.Boolean, default=False)
    
    # Network information
    ip_address = db.Column(db.String(45))  # IPv6 support
    user_agent = db.Column(db.Text)
    location_data = db.Column(db.Text)  # JSON string
    
    # Status information
    battery_level = db.Column(db.Integer)
    is_charging = db.Column(db.Boolean, default=False)
    memory_usage = db.Column(db.Integer)  # MB
    cpu_usage = db.Column(db.Float)  # Percentage
    
    # Relationships
    data_collections = db.relationship('DataCollection', backref='device', lazy='dynamic', cascade='all, delete-orphan')
    commands = db.relationship('Command', backref='device', lazy='dynamic', cascade='all, delete-orphan')
    security_reports = db.relationship('SecurityReport', backref='device', lazy='dynamic', cascade='all, delete-orphan')
    
    def __getattribute__(self, name):
        # Safely provide primary key even if instance is detached/expired
        if name == 'id':
            try:
                state = sa_inspect(self)
                ident = state.identity
                if ident and len(ident) > 0:
                    return ident[0]
            except Exception:
                pass
        return super().__getattribute__(name)

    def __repr__(self):
        """Safe repr that won't trigger attribute refresh on detached instances."""
        try:
            state = sa_inspect(self)
            ident = None
            try:
                ident = state.identity
            except Exception:
                ident = None
            pk = None
            if ident and len(ident) > 0:
                pk = ident[0]
            return f'<Device id={pk if pk is not None else "unknown"}>'
        except Exception:
            return '<Device>'
    
    def to_dict(self):
        """Convert device to dictionary"""
        return {
            'id': self.id,
            'device_id': self.device_id,
            'device_name': self.device_name,
            'manufacturer': self.manufacturer,
            'model': self.model,
            'android_version': self.android_version,
            'sdk_version': self.sdk_version,
            'is_rooted': self.is_rooted,
            'is_connected': self.is_connected,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'security_level': self.security_level,
            'has_biometric': self.has_biometric,
            'has_vpn': self.has_vpn,
            'is_encrypted': self.is_encrypted,
            'ip_address': self.ip_address,
            'battery_level': self.battery_level,
            'is_charging': self.is_charging,
            'memory_usage': self.memory_usage,
            'cpu_usage': self.cpu_usage,
            'location_data': json.loads(self.location_data) if self.location_data else None
        }
    
    def update_status(self, status_data):
        """Update device status with new data"""
        if 'battery_level' in status_data:
            self.battery_level = status_data['battery_level']
        if 'is_charging' in status_data:
            self.is_charging = status_data['is_charging']
        if 'memory_usage' in status_data:
            self.memory_usage = status_data['memory_usage']
        if 'cpu_usage' in status_data:
            self.cpu_usage = status_data['cpu_usage']
        if 'ip_address' in status_data:
            self.ip_address = status_data['ip_address']
        if 'location_data' in status_data:
            self.location_data = json.dumps(status_data['location_data'])
        
        self.last_seen = datetime.utcnow()
        self.is_connected = True
    
    def mark_disconnected(self):
        """Mark device as disconnected"""
        self.is_connected = False
        self.last_seen = datetime.utcnow()
    
    @classmethod
    def get_active_devices(cls):
        """Get all currently connected devices"""
        return cls.query.filter_by(is_connected=True).all()
    
    @classmethod
    def get_device_by_id(cls, device_id):
        """Get device by device_id"""
        return cls.query.filter_by(device_id=device_id).first()
    
    @classmethod
    def get_device_stats(cls):
        """Get device statistics"""
        total = cls.query.count()
        connected = cls.query.filter_by(is_connected=True).count()
        rooted = cls.query.filter_by(is_rooted=True).count()
        
        return {
            'total_devices': total,
            'connected_devices': connected,
            'rooted_devices': rooted,
            'connection_rate': (connected / total * 100) if total > 0 else 0
        } 