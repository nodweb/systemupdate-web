import os
from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    # Get environment variables
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    
    # Security check for production
    if not debug and (not os.environ.get('SECRET_KEY') or not os.environ.get('JWT_SECRET_KEY')):
        raise ValueError("SECRET_KEY and JWT_SECRET_KEY environment variables are required in production")
    
    print(f"Starting SystemUpdate Web Dashboard...")
    print(f"Environment: {'Development' if debug else 'Production'}")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    
    # Run the application
    socketio.run(
        app,
        host=host,
        port=port,
        debug=debug,
        use_reloader=debug,
        log_output=True
    ) 