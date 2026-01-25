from __future__ import annotations

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    env: str = Field(default="local", validation_alias="ENV")
    port: int = Field(default=8001, validation_alias="PORT")
    allowed_origins: str = Field(default="http://localhost:3000", validation_alias="ALLOWED_ORIGINS")
    backend_base_url: str = Field(default="http://localhost:8080", validation_alias="BACKEND_BASE_URL")
    database_url: Optional[str] = Field(default=None, validation_alias="DATABASE_URL")
    log_level: str = Field(default="info", validation_alias="LOG_LEVEL")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


def get_allowed_origins_list(value: str) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def build_database_url_from_pg_env() -> Optional[str]:
    import os

    host = os.getenv("PGHOST")
    port = os.getenv("PGPORT", "5432")
    user = os.getenv("PGUSER")
    password = os.getenv("PGPASSWORD")
    database = os.getenv("PGDATABASE")

    if not all([host, user, password, database]):
        return None
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


def get_database_url(settings: Settings) -> Optional[str]:
    return settings.database_url or build_database_url_from_pg_env()


settings = Settings()
