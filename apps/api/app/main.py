from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import rfq, auth


def create_app() -> FastAPI:
    app = FastAPI()
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

    # On startup, create database tables if they don't exist
    from .db import engine, Base  # imported here to avoid circular imports

    @app.on_event("startup")
    async def on_startup() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()