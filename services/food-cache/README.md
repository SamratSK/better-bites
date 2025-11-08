# Food Cache Service

FastAPI-based caching proxy that fronts OpenFoodFacts to provide reliable barcode lookups for the Better Bites web client. The service stores normalized nutrition payloads in a persistent SQLite database (swap for Postgres or Redis in production) and exposes endpoints for lookups, bulk ingestion, and manual refresh.

## Features

- `GET /foods/{barcode}` returns cached payloads and refreshes stale entries automatically
- `GET /search?q=term` lightweight name search over cached products
- `POST /foods/bulk` and `POST /foods/{barcode}/refresh` (protected by service key) for admin ingestion flows
- Configurable cache TTL; default 72h before refreshing OpenFoodFacts
- Optional Supabase service role credentials for future synchronization hooks

## Project layout

```
services/food-cache/
├── app/
│   ├── config.py           # Environment loading using pydantic-settings
│   ├── database.py         # Async SQLAlchemy engine + session helper
│   ├── models.py           # FoodProduct table definition
│   ├── schemas.py          # Pydantic request/response models
│   ├── crud.py             # Query helpers for food records
│   ├── openfoodfacts.py    # External API client wrapper
│   ├── dependencies.py     # Shared FastAPI dependencies (API key validation)
│   └── main.py             # FastAPI app and route definitions
├── pyproject.toml
└── .env.example
```

## Getting started

```bash
cd services/food-cache
python -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
uvicorn app.main:app --reload --port 5100
```

Configure `CACHE_SERVICE_API_KEY` and pass the same value via the Angular client's `openFoodFactsProxyUrl` service header for authenticated write operations.

## Future enhancements

- Replace SQLite with a managed Postgres instance (Supabase) or Redis for large-scale caches
- Background task to revalidate stale items asynchronously using Celery or APScheduler
- Webhook integration that writes curated items (admin corrections) back to Supabase `food_references`
