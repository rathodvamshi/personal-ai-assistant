# backend/app/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Pydantic model for loading and validating environment variables.
    """
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    GEMINI_API_KEY: str # Add the new variable here

    model_config = SettingsConfigDict(env_file=".env")

# Create a single, reusable instance of the settings
settings = Settings()
