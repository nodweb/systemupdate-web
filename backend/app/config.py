import os
from datetime import timedelta
import warnings

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-in-production'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    # Enrollment key for device provisioning/auth (set in environment for production)
    DEVICE_ENROLLMENT_KEY = os.environ.get('DEVICE_ENROLLMENT_KEY', '')

    # Redis configuration
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
    # Rate limiting
    RATELIMIT_STORAGE_URL = REDIS_URL
    
    # Security
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'logs/app.log')

    def validate_security_keys(self):
        """Validate security keys for production environment"""
        if not self.SECRET_KEY or self.SECRET_KEY.startswith('your-secret-key'):
            raise RuntimeError("SECRET_KEY must be set in environment variables for production!")
        if not self.JWT_SECRET_KEY or self.JWT_SECRET_KEY.startswith('jwt-secret-key'):
            raise RuntimeError("JWT_SECRET_KEY must be set in environment variables for production!")

    def warn_development_keys(self):
        """Warn about default keys in development"""
        if self.SECRET_KEY.startswith('your-secret-key'):
            warnings.warn("⚠️  WARNING: Using default SECRET_KEY. Set SECRET_KEY environment variable for production!", RuntimeWarning)
        if self.JWT_SECRET_KEY.startswith('jwt-secret-key'):
            warnings.warn("⚠️  WARNING: Using default JWT_SECRET_KEY. Set JWT_SECRET_KEY environment variable for production!", RuntimeWarning)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'postgresql://systemupdate_user:password@localhost/systemupdate_dev'
    
    # Development specific settings
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)  # Longer tokens for development

    def __init__(self):
        super().__init__()
        self.warn_development_keys()

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://systemupdate_user:password@localhost/systemupdate'
    
    # Production security settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # SSL/TLS settings
    SSL_REDIRECT = True
    
    # Logging
    LOG_LEVEL = 'WARNING'

    def __init__(self):
        super().__init__()
        self.validate_security_keys()

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    
    # Disable rate limiting for tests
    RATELIMIT_ENABLED = False 