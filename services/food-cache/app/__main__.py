import uvicorn

from .config import get_settings


def main() -> None:
  settings = get_settings()
  uvicorn.run(
    "app.main:app",
    host="0.0.0.0",
    port=5100,
    reload=False,
    log_level="info",
  )


if __name__ == "__main__":
  main()
