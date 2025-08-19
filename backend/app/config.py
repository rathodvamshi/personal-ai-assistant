# backend/app/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    """
    Pydantic model for loading and validating environment variables.
    """
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    
    # Load all API keys
    GEMINI_API_KEYS: str
    COHERE_API_KEY: str
    ANTHROPIC_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env")

# Create a single, reusable instance of the settings
settings = Settings()
