from app import db
from datetime import datetime
from uuid import uuid4
import json

class OutboxEvent(db.Model):
    __tablename__ = 'outbox_events'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    aggregate_id = db.Column(db.String(64), nullable=False, index=True)
    event_type = db.Column(db.String(100), nullable=False, index=True)
    payload = db.Column(db.Text, nullable=False)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    processed = db.Column(db.Boolean, default=False, index=True)
    processed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'aggregate_id': self.aggregate_id,
            'event_type': self.event_type,
            'payload': json.loads(self.payload) if self.payload else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processed': self.processed,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
        }
