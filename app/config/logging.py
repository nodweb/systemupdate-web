"""
Logging configuration for the application.
"""
import os
from typing import Dict, Any, Optional

from pydantic import Field
try:  # Pydantic v2
    from pydantic import field_validator as validator  # type: ignore
except Exception:  # Pydantic v1
    from pydantic import validator  # type: ignore
try:  # Pydantic v2 prefers pydantic-settings
    from pydantic_settings import BaseSettings  # type: ignore
except Exception:
    # Fallback for environments with Pydantic v1
    from pydantic import BaseSettings  # type: ignore


class LoggingConfig(BaseSettings):
    """Logging configuration settings."""
    
    # Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    LOG_LEVEL: str = Field(
        default="INFO",
        env="LOG_LEVEL",
        description="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    )
    
    # Log format (json, text)
    LOG_FORMAT: str = Field(
        default="json",
        env="LOG_FORMAT",
        description="Log format (json or text)",
    )
    
    # Log file path (if None, logs to console only)
    LOG_FILE: Optional[str] = Field(
        default=None,
        env="LOG_FILE",
        description="Path to log file (if None, logs to console only)",
    )
    
    # Enable log rotation
    LOG_ROTATE: bool = Field(
        default=True,
        env="LOG_ROTATE",
        description="Enable log rotation",
    )
    
    # Maximum log file size in bytes (for rotation)
    LOG_MAX_SIZE: int = Field(
        default=10 * 1024 * 1024,  # 10MB
        env="LOG_MAX_SIZE",
        description="Maximum log file size in bytes (for rotation)",
    )
    
    # Number of backup log files to keep
    LOG_BACKUP_COUNT: int = Field(
        default=5,
        env="LOG_BACKUP_COUNT",
        description="Number of backup log files to keep",
    )
    
    # Enable JSON logging
    LOG_JSON: bool = Field(
        default=True,
        env="LOG_JSON",
        description="Enable JSON formatted logs",
    )
    
    # Enable request/response logging
    LOG_REQUESTS: bool = Field(
        default=True,
        env="LOG_REQUESTS",
        description="Enable request/response logging",
    )
    
    # Enable SQL query logging
    LOG_SQL_QUERIES: bool = Field(
        default=False,
        env="LOG_SQL_QUERIES",
        description="Enable SQL query logging",
    )
    
    # Enable Kafka consumer logging
    LOG_KAFKA: bool = Field(
        default=True,
        env="LOG_KAFKA",
        description="Enable Kafka consumer logging",
    )
    
    # Enable WebSocket logging
    LOG_WEBSOCKET: bool = Field(
        default=True,
        env="LOG_WEBSOCKET",
        description="Enable WebSocket logging",
    )
    
    class Config:
        """Pydantic config."""
        
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    @validator("LOG_LEVEL")
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        v = v.upper()
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v not in valid_levels:
            raise ValueError(f"Invalid log level: {v}. Must be one of {valid_levels}")
        return v
    
    @validator("LOG_FORMAT")
    def validate_log_format(cls, v: str) -> str:
        """Validate log format."""
        v = v.lower()
        valid_formats = ["json", "text"]
        if v not in valid_formats:
            raise ValueError(f"Invalid log format: {v}. Must be one of {valid_formats}")
        return v
    
    @validator("LOG_FILE", pre=True)
    def validate_log_file(cls, v: Optional[str]) -> Optional[str]:
        """Validate log file path."""
        if v is None:
            return None
        
        # Ensure the directory exists
        log_dir = os.path.dirname(v)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
            
        return v


# Create a single instance of the config
logging_config = LoggingConfig()

def get_logging_config() -> LoggingConfig:
    """Get the logging configuration."""
    return logging_config
