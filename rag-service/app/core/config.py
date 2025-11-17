from functools import lru_cache
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = Field(default="rag-service", env="APP_NAME")
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres",
        env="RAG_DATABASE_URL",
    )
    openai_api_key: str | None = Field(default=None, env="OPENAI_API_KEY")
    prometheus_port: int = Field(default=9101, env="PROMETHEUS_PORT")
    fallback_language: str = Field(default="pl", env="FALLBACK_LANGUAGE")

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
