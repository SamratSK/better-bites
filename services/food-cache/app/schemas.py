from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, ConfigDict


class FoodProductCreate(BaseModel):
  barcode: str
  name: str
  brand: str | None = None
  serving_size: str | None = None
  calories: float | None = None
  macros: dict[str, Any] = Field(default_factory=dict)
  micros: dict[str, Any] = Field(default_factory=dict)
  source: str = "open_food_facts"
  last_synced_at: datetime | None = None


class FoodProductResponse(FoodProductCreate):
  id: str
  created_at: datetime
  updated_at: datetime
  model_config = ConfigDict(from_attributes=True)
