from libs.shared_python.config_base import BaseServiceSettings


class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "command-service"

    # Command specific
    COMMAND_PUBLISH_ENABLED: bool = True
    COMMAND_TTL_SECONDS: int = 3600
    MAX_COMMAND_SIZE: int = 1_048_576  # 1MB


settings = Settings()
