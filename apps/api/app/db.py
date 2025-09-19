"""
Database configuration and session management using SQLAlchemy 2.0 with async support.

The database URL is read from the environment variable `DATABASE_URL`.
This module provides a global asynchronous engine, a session factory, and a
Base class for declarative models.
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv


# Load variables from .env if present
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

# Create an asynchronous engine
engine = create_async_engine(DATABASE_URL, future=True, echo=False)

# Session factory for async sessions
AsyncSessionLocal = sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)

# Declarative Base for models
Base = declarative_base()


async def get_db():
    """Yield a database session for dependency injection."""
    async with AsyncSessionLocal() as session:
        yield session