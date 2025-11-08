from __future__ import annotations

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

from .config import get_settings

settings = get_settings()
api_key_header = APIKeyHeader(name="X-Service-Key", auto_error=False)


def verify_service_key(api_key: str | None = Security(api_key_header)) -> None:
  if settings.service_api_key is None:
    return
  if api_key != settings.service_api_key:
    raise HTTPException(status_code=401, detail="Invalid service key")


def admin_key_required(api_key: str | None = Depends(api_key_header)) -> None:
  verify_service_key(api_key)
