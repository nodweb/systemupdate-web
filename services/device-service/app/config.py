from typing import Optional

from libs.shared_python.config_base import BaseServiceSettings


class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "device-service"

    # Auth
    AUTH_REQUIRED: bool = False
    AUTHZ_REQUIRED: bool = False
    OPA_REQUIRED: bool = False
    AUTH_INTROSPECT_URL: str = "http://auth-service:8001/api/auth/introspect"
    AUTH_AUTHORIZE_URL: str = "http://auth-service:8001/api/auth/authorize"


settings = Settings()
