from libs.shared_python.config_base import BaseServiceSettings


class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "ws-hub"
    HEARTBEAT_INTERVAL_SEC: int = 15


settings = Settings()
