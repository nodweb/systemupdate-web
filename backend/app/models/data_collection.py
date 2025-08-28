from app import db
from datetime import datetime
import json

class DataCollection(db.Model):
    """Data collection model for storing collected data from devices"""
    __tablename__ = 'data_collections'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False, index=True)
    data_type = db.Column(db.String(50), nullable=False, index=True)  # sms, contacts, calls, files, etc.
    data_content = db.Column(db.Text)  # Encrypted data content
    data_size = db.Column(db.Integer)  # Size in bytes
    is_encrypted = db.Column(db.Boolean, default=True)
    encryption_key_id = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    processed_at = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='pending')  # pending, processed, failed
    
    # Metadata
    meta_json = db.Column(db.Text)  # JSON string for additional info (renamed from 'metadata')
    source_app = db.Column(db.String(255))
    collection_method = db.Column(db.String(50))
    
    # Relationship is defined on Device model as Device.data_collections; avoid duplicate backref here
    
    def __repr__(self):
        return f'<DataCollection {self.data_type} from device {self.device_id}>'
    
    def to_dict(self):
        """Convert data collection to dictionary"""
        return {
            'id': self.id,
            'device_id': self.device_id,
            'data_type': self.data_type,
            'data_size': self.data_size,
            'is_encrypted': self.is_encrypted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'status': self.status,
            'source_app': self.source_app,
            'collection_method': self.collection_method,
            'metadata': json.loads(self.meta_json) if self.meta_json else None
        }
    
    def mark_processed(self):
        """Mark data as processed"""
        self.processed_at = datetime.utcnow()
        self.status = 'processed'
    
    def mark_failed(self):
        """Mark data as failed"""
        self.status = 'failed'
    
    @classmethod
    def get_pending_collections(cls):
        """Get all pending data collections"""
        return cls.query.filter_by(status='pending').all()
    
    @classmethod
    def get_collections_by_type(cls, data_type):
        """Get collections by data type"""
        return cls.query.filter_by(data_type=data_type).all()
    
    @classmethod
    def get_device_collections(cls, device_id):
        """Get all collections for a specific device"""
        return cls.query.filter_by(device_id=device_id).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_collection_stats(cls):
        """Get data collection statistics"""
        total = cls.query.count()
        pending = cls.query.filter_by(status='pending').count()
        processed = cls.query.filter_by(status='processed').count()
        failed = cls.query.filter_by(status='failed').count()
        
        # Get data type distribution
        type_stats = db.session.query(
            cls.data_type,
            db.func.count(cls.id).label('count')
        ).group_by(cls.data_type).all()
        
        return {
            'total_collections': total,
            'pending_collections': pending,
            'processed_collections': processed,
            'failed_collections': failed,
            'type_distribution': {stat.data_type: stat.count for stat in type_stats}
        }

class Contact(db.Model):
    """Contact model for storing contact information"""
    __tablename__ = 'contacts'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False, index=True)
    name = db.Column(db.String(255))
    phone_number = db.Column(db.String(50))
    email = db.Column(db.String(255))
    company = db.Column(db.String(255))
    job_title = db.Column(db.String(255))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    device = db.relationship('Device', backref='contacts')
    
    def __repr__(self):
        return f'<Contact {self.name} from device {self.device_id}>'
    
    def to_dict(self):
        """Convert contact to dictionary"""
        return {
            'id': self.id,
            'device_id': self.device_id,
            'name': self.name,
            'phone_number': self.phone_number,
            'email': self.email,
            'company': self.company,
            'job_title': self.job_title,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class SMS(db.Model):
    """SMS model for storing SMS messages"""
    __tablename__ = 'sms_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False, index=True)
    address = db.Column(db.String(255))  # Phone number
    body = db.Column(db.Text)
    type = db.Column(db.String(20))  # sent, received
    timestamp = db.Column(db.DateTime)
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    device = db.relationship('Device', backref='sms_messages')
    
    def __repr__(self):
        return f'<SMS {self.type} from {self.address} on device {self.device_id}>'
    
    def to_dict(self):
        """Convert SMS to dictionary"""
        return {
            'id': self.id,
            'device_id': self.device_id,
            'address': self.address,
            'body': self.body,
            'type': self.type,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'read': self.read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CallLog(db.Model):
    """Call log model for storing call history"""
    __tablename__ = 'call_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False, index=True)
    number = db.Column(db.String(50))
    name = db.Column(db.String(255))
    call_type = db.Column(db.String(20))  # incoming, outgoing, missed
    duration = db.Column(db.Integer)  # Duration in seconds
    timestamp = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    device = db.relationship('Device', backref='call_logs')
    
    def __repr__(self):
        return f'<CallLog {self.call_type} to {self.number} on device {self.device_id}>'
    
    def to_dict(self):
        """Convert call log to dictionary"""
        return {
            'id': self.id,
            'device_id': self.device_id,
            'number': self.number,
            'name': self.name,
            'call_type': self.call_type,
            'duration': self.duration,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        } 