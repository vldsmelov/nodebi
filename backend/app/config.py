from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Node BI API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://nodebi:nodebi_dev@localhost:5432/nodebi"
    storage_root: Path = Path("./storage")
    max_upload_bytes: int = Field(default=52_428_800, gt=0)
    max_preview_rows: int = Field(default=200, gt=0, le=10_000)
    max_release_bytes: int = Field(default=268_435_456, gt=0)
    log_level: str = "INFO"
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
