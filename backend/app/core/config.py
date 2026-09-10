import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator


class Settings(BaseSettings):
    PROJECT_NAME: str = "CloudNet: National Weather Big Data Analytics Platform"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Security / Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cloudnet-sih-2026-national-weather-security-key-super-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Initial Admin Seed Credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@cloudnet.gov.in")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "CloudNet@Admin2026")
    
    # Database configuration
    # Resolve absolute path to cloudnet.db so it works from any working directory
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite+aiosqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'cloudnet.db'))}"
    )
    
    # Redis configuration (optional, fallback to in-memory)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS: bool = os.getenv("USE_REDIS", "false").lower() == "true"
    
    # Object Storage (MinIO / S3)
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "local")  # local or s3
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./storage")
    
    # Confidence Engine Policy Weights
    WEIGHT_SOURCE_RELIABILITY: float = 0.25
    WEIGHT_TEMPORAL_CONSISTENCY: float = 0.20
    WEIGHT_GEOGRAPHIC_CONSISTENCY: float = 0.20
    WEIGHT_INDEPENDENT_CORROBORATION: float = 0.15
    WEIGHT_TELEMETRY_AGREEMENT: float = 0.10
    WEIGHT_CONTENT_CONSISTENCY: float = 0.10
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*"
    ]

    # Twitter / X Social Stream Integration
    TWITTER_BEARER_TOKEN: str = os.getenv("TWITTER_BEARER_TOKEN", "")
    TWITTER_API_ENDPOINT: str = os.getenv("TWITTER_API_ENDPOINT", "https://api.twitter.com/2/tweets/search/recent")

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
