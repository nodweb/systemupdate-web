from pydantic_settings import BaseSettings
from pydantic import field_validator


class BaseServiceSettings(BaseSettings):
    SERVICE_NAME: str
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Auth
    AUTH_REQUIRED: bool = False
    AUTHZ_REQUIRED: bool = False
    OPA_REQUIRED: bool = False

    # Monitoring
    ENABLE_METRICS: bool = True
    ENABLE_TRACING: bool = True

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        vv = (v or "").upper()
        if vv not in valid:
            raise ValueError(f"Invalid log level: {v}")
        return vv

    class Config:
        env_file = ".env"
        case_sensitive = True
