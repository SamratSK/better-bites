from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import FoodProduct
from .schemas import FoodProductCreate


async def get_food_by_barcode(session: AsyncSession, barcode: str) -> FoodProduct | None:
  result = await session.execute(select(FoodProduct).where(FoodProduct.barcode == barcode))
  return result.scalar_one_or_none()


async def upsert_food(session: AsyncSession, payload: FoodProductCreate) -> FoodProduct:
  existing = await get_food_by_barcode(session, payload.barcode)
  timestamp = payload.last_synced_at or datetime.now(timezone.utc)

  if existing:
    existing.name = payload.name
    existing.brand = payload.brand
    existing.serving_size = payload.serving_size
    existing.calories = payload.calories
    existing.macros = payload.macros
    existing.micros = payload.micros
    existing.source = payload.source
    existing.last_synced_at = timestamp
    await session.flush()
    await session.refresh(existing)
    return existing

  record = FoodProduct(
    barcode=payload.barcode,
    name=payload.name,
    brand=payload.brand,
    serving_size=payload.serving_size,
    calories=payload.calories,
    macros=payload.macros,
    micros=payload.micros,
    source=payload.source,
    last_synced_at=timestamp,
  )
  session.add(record)
  await session.flush()
  await session.refresh(record)
  return record
