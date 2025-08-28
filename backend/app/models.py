from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
import uuid

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')  # admin, user
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def generate_token(self):
        return create_access_token(identity=self.id)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class Device(db.Model):
    __tablename__ = 'devices'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(100), unique=True, nullable=False)
    device_name = db.Column(db.String(100))
    model = db.Column(db.String(100))
    android_version = db.Column(db.String(20))
    manufacturer = db.Column(db.String(100))
    is_online = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    battery_level = db.Column(db.Integer)
    is_charging = db.Column(db.Boolean, default=False)
    current_app = db.Column(db.String(100))
    screen_resolution = db.Column(db.String(20))
    ip_address = db.Column(db.String(45))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    logs = db.relationship('DeviceLog', backref='device', lazy=True, cascade='all, delete-orphan')
    commands = db.relationship('Command', backref='device', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'device_name': self.device_name,
            'model': self.model,
            'android_version': self.android_version,
            'manufacturer': self.manufacturer,
            'is_online': self.is_online,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'battery_level': self.battery_level,
            'is_charging': self.is_charging,
            'current_app': self.current_app,
            'screen_resolution': self.screen_resolution,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DeviceLog(db.Model):
    __tablename__ = 'device_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False)
    log_type = db.Column(db.String(50), nullable=False)  # data_collection, command, error, security
    message = db.Column(db.Text, nullable=False)
    level = db.Column(db.String(20), default='info')  # debug, info, warning, error
    data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'log_type': self.log_type,
            'message': self.message,
            'level': self.level,
            'data': self.data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Command(db.Model):
    __tablename__ = 'commands'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False)
    command_type = db.Column(db.String(50), nullable=False)  # app_control, ui_control, data_collection, etc.
    command_data = db.Column(db.JSON, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, executing, completed, failed
    result = db.Column(db.JSON)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    executed_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'command_type': self.command_type,
            'command_data': self.command_data,
            'status': self.status,
            'result': self.result,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class Analytics(db.Model):
    __tablename__ = 'analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False)
    metric_type = db.Column(db.String(50), nullable=False)  # battery, app_usage, data_transfer, etc.
    metric_value = db.Column(db.Float, nullable=False)
    metric_unit = db.Column(db.String(20))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    meta_data = db.Column(db.JSON)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'metric_type': self.metric_type,
            'metric_value': self.metric_value,
            'metric_unit': self.metric_unit,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'meta_data': self.meta_data
        } 