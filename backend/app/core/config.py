"""Configuration settings for the application."""
import os
from typing import Optional


class Settings:
    """Application settings loaded from environment variables."""
    
    # LLM Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.3"))
    
    # API Configuration
    API_V1_PREFIX: str = "/api"
    
    # CORS Configuration
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Statistical defaults
    DEFAULT_ALPHA: float = 0.05
    DEFAULT_POWER: float = 0.8
    
    # Sample size thresholds
    MIN_SAMPLE_SIZE_WARNING: int = 100
    MIN_EVENTS_WARNING: int = 10


settings = Settings()


