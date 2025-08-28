from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
from datetime import timedelta
from flasgger import Swagger
import hashlib

# Initialize extensions
db = SQLAlchemy()
socketio = SocketIO()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    
    # Configuration - Use environment variables for security
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    if not app.config['SECRET_KEY']:
        raise ValueError("SECRET_KEY environment variable is required")
    
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
    if not app.config['JWT_SECRET_KEY']:
        raise ValueError("JWT_SECRET_KEY environment variable is required")
    
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///systemupdate.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # Keep ORM instances' state after commit to prevent attribute expiration in tests
    app.config['SQLALCHEMY_EXPIRE_ON_COMMIT'] = False
    
    # Safe fingerprint logging for diagnostics (no secret exposure)
    try:
        _jwt_secret = app.config.get('JWT_SECRET_KEY')
        if _jwt_secret:
            _fp = hashlib.sha256(_jwt_secret.encode('utf-8')).hexdigest()[:10]
            app.logger.info(f"JWT secret startup fp={_fp} len={len(_jwt_secret)}")
    except Exception as e:
        app.logger.warning("Failed to compute JWT secret fingerprint: %s", e)
    
    # Security headers
    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        # Apply a conservative CSP in production only
        env_val = os.environ.get('FLASK_ENV') or app.config.get('ENV')
        if str(env_val).lower() == 'production':
            response.headers['Content-Security-Policy'] = (
                "default-src 'self'; "
                "img-src 'self' data: https:; "
                "style-src 'self' 'unsafe-inline'; "
                "script-src 'self' 'unsafe-inline'; "
                "connect-src 'self' https: wss:;"
            )
        return response
    
    # Initialize extensions
    # CORS: allow Vite/React dev servers for API routes and common headers/methods
    allowed_origins = [
        'http://localhost:3000', 'http://127.0.0.1:3000',
        'http://localhost:5173', 'http://127.0.0.1:5173',
        'http://localhost:5174', 'http://127.0.0.1:5174',
    ]
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type", "Authorization"]
    )
    db.init_app(app)
    # Keep attributes available after commit to avoid DetachedInstanceError in tests
    with app.app_context():
        try:
            db.session.expire_on_commit = False
        except Exception as e:
            app.logger.warning("Failed to set expire_on_commit: %s", e)
    socketio.init_app(app, cors_allowed_origins="*")
    jwt.init_app(app)
    Migrate(app, db)
    
    # Swagger/OpenAPI documentation
    app.config['SWAGGER'] = {
        'title': 'SystemUpdate API',
        'uiversion': 3
    }
    Swagger(app)
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.devices import devices_bp
    from .routes.analytics import analytics_bp
    from .routes.commands import commands_bp
    from .routes.health import health_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(devices_bp, url_prefix='/api/devices')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(commands_bp)
    app.register_blueprint(health_bp)
    
    # Register error handlers
    from app.utils.error_handlers import register_error_handlers
    register_error_handlers(app)
    
    # Register WebSocket events
    from app.socketio_events import register_socketio_events
    register_socketio_events(socketio)
    
    # Ensure database tables exist (development convenience)
    with app.app_context():
        db.create_all()
    
    return app