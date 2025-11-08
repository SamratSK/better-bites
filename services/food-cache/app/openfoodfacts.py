from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from .config import get_settings
from .schemas import FoodProductCreate

settings = get_settings()


async def fetch_openfoodfacts(barcode: str) -> FoodProductCreate | None:
  endpoint = f"{settings.openfoodfacts_base_url}/api/v2/product/{barcode}.json"
  async with httpx.AsyncClient(timeout=10.0) as client:
    response = await client.get(endpoint)

  if response.status_code == 404:
    return None

  response.raise_for_status()
  payload = response.json()

  if payload.get("status") != 1:
    return None

  product: dict[str, Any] = payload.get("product", {})
  nutriments: dict[str, Any] = product.get("nutriments", {})

  macros = {
    "protein": to_float(nutriments.get("proteins_serving")) or to_float(nutriments.get("proteins_100g")) or 0.0,
    "carbs": to_float(nutriments.get("carbohydrates_serving")) or to_float(nutriments.get("carbohydrates_100g")) or 0.0,
    "fat": to_float(nutriments.get("fat_serving")) or to_float(nutriments.get("fat_100g")) or 0.0,
  }

  micros = {
    key: value
    for key, value in nutriments.items()
    if key.endswith("_100g") and isinstance(value, (int, float))
  }

  return FoodProductCreate(
    barcode=barcode,
    name=product.get("product_name") or product.get("generic_name") or "Unknown product",
    brand=product.get("brands") or None,
    serving_size=product.get("serving_size"),
    calories=to_float(nutriments.get("energy-kcal_serving"))
    or to_float(nutriments.get("energy-kcal_100g"))
    or None,
    macros=macros,
    micros=micros,
    source="open_food_facts",
    last_synced_at=datetime.now(timezone.utc),
  )


def to_float(value: Any) -> float | None:
  try:
    if value is None:
      return None
    return float(value)
  except (TypeError, ValueError):
    return None
