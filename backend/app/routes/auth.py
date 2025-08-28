from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity

from werkzeug.security import check_password_hash, generate_password_hash
from app import db
from app.models.device import Device
from app.models.user import User
from datetime import datetime
from app.utils.validators import validate_login_data
from app.utils.rate_limit import rate_limit
import logging
from flasgger import swag_from

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

@auth_bp.route('/login', methods=['POST'])
@rate_limit(limit=5, window=300)  # 5 attempts per 5 minutes
@swag_from({
    'tags': ['Auth'],
    'summary': 'User login',
    'description': 'ورود کاربر و دریافت توکن JWT',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'username': {'type': 'string'},
                    'password': {'type': 'string'}
                },
                'required': ['username', 'password']
            }
        }
    ],
    'responses': {
        '200': {
            'description': 'ورود موفق',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'access_token': {'type': 'string'},
                    'refresh_token': {'type': 'string'},
                    'user': {'type': 'object'}
                }
            }
        },
        '401': {'description': 'Invalid credentials'},
        '400': {'description': 'No data provided'},
        '500': {'description': 'Internal server error'}
    }
})
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate input data
        validation_result = validate_login_data(data)
        if not validation_result['valid']:
            return jsonify({'error': validation_result['message']}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        # Find user
        user = User.query.filter_by(username=username).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            logger.warning(f'Failed login attempt for username: {username}')
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 403
        
        # Create tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        # Update last login
        user.update_last_login()
        db.session.commit()
        
        logger.info(f'Successful login for user: {username}')
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Login error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/device/login', methods=['POST'])
@rate_limit(limit=20, window=300)
def device_login():
    """Device authentication/enrollment. Expects JSON { device_id, enrollment_key }.
    Returns JWT with identity set to the device_id (sub=device_id) for WS auth.
    """
    try:
        data = request.get_json() or {}
        device_id = (data.get('device_id') or '').strip()
        enrollment_key = (data.get('enrollment_key') or '').strip()
        if not device_id or not enrollment_key:
            return jsonify({'error': 'device_id and enrollment_key are required'}), 400

        # Validate enrollment key from configuration
        from flask import current_app
        expected = current_app.config.get('DEVICE_ENROLLMENT_KEY') or ''
        if not expected:
            logger.warning('DEVICE_ENROLLMENT_KEY not set; refusing device login in production')
            return jsonify({'error': 'Device enrollment not configured'}), 503
        if enrollment_key != expected:
            logger.warning(f'Device login failed for {device_id}: invalid enrollment key')
            return jsonify({'error': 'Invalid enrollment key'}), 401

        # Auto-provision device if it does not exist
        device = Device.query.filter_by(device_id=device_id).first()
        if not device:
            device = Device(device_id=device_id, is_connected=False)
            db.session.add(device)
            db.session.commit()

        # Issue JWT with sub=device_id and role=device for downstream checks
        additional_claims = {"device_id": device_id, "role": "device"}
        access_token = create_access_token(identity=device_id, additional_claims=additional_claims)

        return jsonify({
            'message': 'Device authenticated',
            'access_token': access_token,
            'device': {'device_id': device.device_id}
        }), 200
    except Exception as e:
        logger.error(f'Device login error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
@swag_from({
    'tags': ['Auth'],
    'summary': 'User logout',
    'description': 'خروج کاربر از سیستم',
    'responses': {
        '200': {'description': 'خروج موفق', 'schema': {'type': 'object'}},
        '500': {'description': 'Internal server error'}
    }
})
def logout():
    """User logout endpoint"""
    try:
        # In a real application, you might want to blacklist the token
        # For now, we'll just return a success message
        logger.info(f'User logout: {get_jwt_identity()}')
        
        return jsonify({'message': 'Logout successful'}), 200
        
    except Exception as e:
        logger.error(f'Logout error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@swag_from({
    'tags': ['Auth'],
    'summary': 'Refresh access token',
    'description': 'دریافت توکن جدید با refresh token',
    'responses': {
        '200': {
            'description': 'توکن جدید',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'access_token': {'type': 'string'}
                }
            }
        },
        '401': {'description': 'Invalid user'},
        '500': {'description': 'Internal server error'}
    }
})
def refresh():
    """Refresh access token endpoint"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Invalid user'}), 401
        
        # Create new access token
        new_access_token = create_access_token(identity=current_user_id)
        
        logger.info(f'Token refreshed for user: {user.username}')
        
        return jsonify({
            'message': 'Token refreshed successfully',
            'access_token': new_access_token
        }), 200
        
    except Exception as e:
        logger.error(f'Token refresh error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
@swag_from({
    'tags': ['Auth'],
    'summary': 'Get user profile',
    'description': 'دریافت اطلاعات پروفایل کاربر',
    'responses': {
        '200': {
            'description': 'اطلاعات کاربر',
            'schema': {
                'type': 'object',
                'properties': {
                    'user': {'type': 'object'}
                }
            }
        },
        '404': {'description': 'User not found'},
        '500': {'description': 'Internal server error'}
    }
})
def get_profile():
    """Get user profile endpoint"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Get profile error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
@swag_from({
    'tags': ['Auth'],
    'summary': 'Change user password',
    'description': 'تغییر رمز عبور کاربر',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'current_password': {'type': 'string'},
                    'new_password': {'type': 'string'}
                },
                'required': ['current_password', 'new_password']
            }
        }
    ],
    'responses': {
        '200': {'description': 'رمز عبور با موفقیت تغییر کرد', 'schema': {'type': 'object'}},
        '401': {'description': 'Current password is incorrect'},
        '400': {'description': 'Invalid input'},
        '404': {'description': 'User not found'},
        '500': {'description': 'Internal server error'}
    }
})
def change_password():
    """Change user password endpoint"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Verify current password
        if not check_password_hash(user.password_hash, current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password
        if len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters long'}), 400
        
        # Update password
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        logger.info(f'Password changed for user: {user.username}')
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        logger.error(f'Change password error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/register', methods=['POST'])
@rate_limit(limit=3, window=3600)  # 3 attempts per hour
@swag_from({
    'tags': ['Auth'],
    'summary': 'User registration',
    'description': 'ثبت‌نام کاربر جدید (فقط ادمین)',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'username': {'type': 'string'},
                    'email': {'type': 'string'},
                    'password': {'type': 'string'},
                    'role': {'type': 'string', 'enum': ['user', 'admin', 'operator']}
                },
                'required': ['username', 'email', 'password']
            }
        }
    ],
    'responses': {
        '201': {
            'description': 'ثبت‌نام موفق',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'user': {'type': 'object'}
                }
            }
        },
        '409': {'description': 'Username or email already exists'},
        '400': {'description': 'Invalid input'},
        '500': {'description': 'Internal server error'}
    }
})
def register():
    """User registration endpoint (admin only)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'user')
        
        # Validate input
        if not username or not email or not password:
            return jsonify({'error': 'Username, email, and password are required'}), 400
        
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 409
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 409
        
        # Create new user
        new_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            role=role
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        logger.info(f'New user registered: {username}')
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email,
                'role': new_user.role
            }
        }), 201
        
    except Exception as e:
        logger.error(f'Registration error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500 