from typing import Optional

from libs.shared_python.config_base import BaseServiceSettings


class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "data-ingest-service"

    # Kafka / topics
    KAFKA_BOOTSTRAP: str = "kafka:9092"
    INGEST_TOPIC: str = "device.ingest.raw"

    # Validation controls
    INGEST_ALLOWED_KINDS: Optional[str] = None  # comma-separated list
    INGEST_MAX_BYTES: int = 524_288  # 512 KiB default

    # Auth controls
    AUTH_REQUIRED: bool = False
    AUTH_INTROSPECT_URL: str = "http://auth-service:8001/api/auth/introspect"


settings = Settings()
