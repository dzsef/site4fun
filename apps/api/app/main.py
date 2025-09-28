import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import DATABASE_URL
from .routers import rfq, auth, profile, chat
from .utils.media import MEDIA_ROOT, ensure_media_directories


def _sync_database_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg"):
        return url.replace("postgresql+asyncpg", "postgresql+psycopg2")
    return url


def _alembic_safe_url(url: str) -> str:
    """Escape percent signs so configparser does not treat them as templates."""
    return url.replace("%", "%%")


def run_migrations() -> None:
    base_dir = Path(__file__).resolve().parent.parent
    alembic_cfg = Config(str(base_dir / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(base_dir / "alembic"))
    escaped_url = _alembic_safe_url(_sync_database_url(DATABASE_URL))
    alembic_cfg.set_main_option("sqlalchemy.url", escaped_url)
    command.upgrade(alembic_cfg, "head")


def create_app() -> FastAPI:
    app = FastAPI()
    ensure_media_directories()
    # Allow cross-origin requests during development. Adjust origins in production.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include the RFQ router
    app.include_router(rfq.router, prefix="/api/v1", tags=["rfq"])

    # Include authentication and user management routes
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(profile.router, prefix="/api/v1/profile", tags=["profile"])
    app.include_router(chat.router, prefix="/api/v1")

    app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")

    # Ensure SQLAlchemy models are registered with metadata for Alembic
    from .models import user  # noqa: F401
    from .models import profile as profile_models  # noqa: F401
    from .models import chat as chat_models  # noqa: F401

    @app.on_event("startup")
    async def on_startup() -> None:
        await asyncio.to_thread(run_migrations)

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
