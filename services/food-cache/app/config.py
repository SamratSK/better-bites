from functools import lru_cache

from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", env_prefix="CACHE_", env_file_encoding="utf-8")

  openfoodfacts_base_url: HttpUrl = HttpUrl("https://world.openfoodfacts.org", scheme="https")
  database_url: str = "sqlite+aiosqlite:///./food_cache.db"
  cache_ttl_hours: int = 72
  service_api_key: str | None = None
  supabase_service_role_key: str | None = None
  supabase_project_url: HttpUrl | None = None
  allowed_origins: list[str] = Field(default_factory=lambda: ['http://localhost:4200'])


@lru_cache
def get_settings() -> Settings:
  return Settings()
