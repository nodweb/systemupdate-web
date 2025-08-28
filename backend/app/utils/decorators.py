from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required

# NOTE: Placeholder role guards. In Phase 1, allow if authenticated.
# Extend later to check roles from DB or JWT claims.

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def wrapper(*args, **kwargs):
        # TODO: check admin role
        return f(*args, **kwargs)
    return wrapper


def operator_required(f):
    @wraps(f)
    @jwt_required()
    def wrapper(*args, **kwargs):
        # TODO: check operator/admin role
        return f(*args, **kwargs)
    return wrapper
