from libs.shared_python.config_base import BaseServiceSettings


class Settings(BaseServiceSettings):
    SERVICE_NAME: str = "auth-service"


settings = Settings()
