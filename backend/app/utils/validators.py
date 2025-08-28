from typing import Dict, Any


def validate_login_data(data: Dict[str, Any]) -> Dict[str, Any]:
    username = (data or {}).get('username')
    password = (data or {}).get('password')
    if not username or not password:
        return {'valid': False, 'message': 'Username and password are required'}
    if len(password) < 4:
        return {'valid': False, 'message': 'Password too short'}
    return {'valid': True, 'message': 'OK'}


def validate_command_data(data: Dict[str, Any]) -> Dict[str, Any]:
    command_type = (data or {}).get('command_type')
    if not command_type or not isinstance(command_type, str):
        return {'valid': False, 'message': 'command_type is required'}
    command_data = data.get('command_data', {})
    if command_data is not None and not isinstance(command_data, dict):
        return {'valid': False, 'message': 'command_data must be an object'}
    priority = data.get('priority', 'normal')
    if priority not in ['low', 'normal', 'high', 'critical']:
        return {'valid': False, 'message': 'priority must be one of low, normal, high, critical'}
    return {'valid': True, 'message': 'OK'}
