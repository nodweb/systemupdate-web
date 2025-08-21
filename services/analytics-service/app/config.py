from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Service identity
    SERVICE_NAME: str = "analytics-service"
    ENVIRONMENT: str = "development"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Kafka
    KAFKA_ENABLED: bool = False
    KAFKA_BOOTSTRAP_SERVERS: Optional[str] = "kafka:9092"
    KAFKA_CONSUMER_GROUP: str = "analytics-consumer"
    KAFKA_TOPICS: List[str] = ["device.ingest.raw"]

    # Analytics specific
    ANALYTICS_CONSUME_ENABLED: bool = False
    BATCH_PROCESSING_ENABLED: bool = False
    BATCH_SIZE: int = 100

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        vv = (v or "").upper()
        if vv not in valid:
            raise ValueError(f"Invalid log level: {v}")
        return vv

    @field_validator("KAFKA_BOOTSTRAP_SERVERS")
    @classmethod
    def validate_kafka_servers(cls, v: Optional[str], values: dict) -> Optional[str]:
        if values.get("KAFKA_ENABLED") and not v:
            raise ValueError(
                "KAFKA_BOOTSTRAP_SERVERS required when KAFKA_ENABLED=true"
            )
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
