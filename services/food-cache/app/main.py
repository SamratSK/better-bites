from __future__ import annotations

from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .crud import get_food_by_barcode, upsert_food
from .database import get_session, init_db
from .dependencies import verify_service_key
from .models import FoodProduct
from .openfoodfacts import fetch_openfoodfacts
from .schemas import FoodProductCreate, FoodProductResponse

settings = get_settings()
app = FastAPI(title="Better Bites Food Cache", version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.allowed_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
  await init_db()


@app.get("/health")
async def health() -> dict[str, str]:
  return {"status": "ok"}


@app.get("/foods/{barcode}", response_model=FoodProductResponse)
async def get_food(
  barcode: str,
  session: Annotated[AsyncSession, Depends(get_session)],
) -> FoodProductResponse:
  record = await get_food_by_barcode(session, barcode)

  if record and not record.is_stale(settings.cache_ttl_hours):
    return FoodProductResponse.model_validate(record)

  external = await fetch_openfoodfacts(barcode)
  if external is None and record is None:
    raise HTTPException(status_code=404, detail="Barcode not found")

  if external is None and record:
    return FoodProductResponse.model_validate(record)

  assert external is not None
  record = await upsert_food(session, external)
  return FoodProductResponse.model_validate(record)


@app.post("/foods/{barcode}/refresh", response_model=FoodProductResponse, dependencies=[Depends(verify_service_key)])
async def refresh_food(
  barcode: str,
  session: Annotated[AsyncSession, Depends(get_session)],
) -> FoodProductResponse:
  external = await fetch_openfoodfacts(barcode)
  if external is None:
    raise HTTPException(status_code=404, detail="Barcode not found in OpenFoodFacts")

  record = await upsert_food(session, external)
  return FoodProductResponse.model_validate(record)


@app.get("/search", response_model=list[FoodProductResponse])
async def search_foods(
  query: Annotated[str, Query(min_length=2)],
  limit: Annotated[int, Query(le=50)] = 20,
  session: Annotated[AsyncSession, Depends(get_session)],
) -> list[FoodProductResponse]:
  stmt = (
    select(FoodProduct)
    .where(func.lower(FoodProduct.name).like(f"%{query.lower()}%"))
    .order_by(FoodProduct.updated_at.desc())
    .limit(limit)
  )
  result = await session.execute(stmt)
  records = result.scalars().all()
  return [FoodProductResponse.model_validate(record) for record in records]


@app.post("/foods/bulk", response_model=list[FoodProductResponse], dependencies=[Depends(verify_service_key)])
async def bulk_upsert(
  payload: list[FoodProductCreate],
  session: Annotated[AsyncSession, Depends(get_session)],
) -> list[FoodProductResponse]:
  responses: list[FoodProductResponse] = []
  for item in payload:
    record = await upsert_food(session, item)
    responses.append(FoodProductResponse.model_validate(record))
  return responses
