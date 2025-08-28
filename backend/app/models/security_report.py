from app import db
from datetime import datetime
import json

class SecurityReport(db.Model):
    """Security report model linked to a device"""
    __tablename__ = 'security_reports'

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False, index=True)
    report_type = db.Column(db.String(100), default='generic')
    severity = db.Column(db.String(20), default='info')  # info, low, medium, high, critical
    details = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f'<SecurityReport {self.report_type} for device {self.device_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'report_type': self.report_type,
            'severity': self.severity,
            'details': json.loads(self.details) if self.details else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
