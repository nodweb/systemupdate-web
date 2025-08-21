from typing import Optional

from libs.shared_python.config_base import BaseServiceSettings


class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "notification-service"

    # Notification specific
    NOTIF_WORKER_ENABLED: bool = True
    WEBHOOK_TIMEOUT: int = 30
    MAX_RETRIES: int = 3

    # Throttling
    NOTIF_THROTTLE_WINDOW_SECONDS: int = 60
    NOTIF_THROTTLE_LIMIT: int = 20

    # External services
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587


settings = Settings()
