from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "StadiaFlow AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Add other configuration variables here
    GOOGLE_MAPS_API_KEY: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
