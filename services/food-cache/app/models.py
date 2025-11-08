from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, JSON, String, text
from sqlalchemy.orm import Mapped, mapped_column

from uuid import uuid4

from .database import Base


class FoodProduct(Base):
  __tablename__ = "food_products"

  id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
  barcode: Mapped[str] = mapped_column(String(64), unique=True, index=True)
  name: Mapped[str] = mapped_column(String(255))
  brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
  serving_size: Mapped[str | None] = mapped_column(String(255), nullable=True)
  calories: Mapped[float | None] = mapped_column()
  macros: Mapped[dict] = mapped_column(JSON, default=dict)
  micros: Mapped[dict] = mapped_column(JSON, default=dict)
  source: Mapped[str] = mapped_column(String(64), default="open_food_facts")
  last_synced_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=text("now()"), nullable=False
  )
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=text("now()"), nullable=False
  )
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=text("now()"), onupdate=text("now()"), nullable=False
  )

  def is_stale(self, ttl_hours: int) -> bool:
    if ttl_hours <= 0:
      return False
    refreshed_at = self.last_synced_at or self.created_at
    if refreshed_at is None:
      return True
    delta = datetime.now(timezone.utc) - refreshed_at
    return delta.total_seconds() > ttl_hours * 3600
