"""
SQLAlchemy model for users. Each user has an email, a hashed password,
a role indicating whether they are a homeowner, contractor or subcontractor,
and a timestamp of when they were created.
"""

from sqlalchemy import Column, Integer, String, DateTime, func

from ..db import Base


class User(Base):
    __tablename__ = "users"

    id: int = Column(Integer, primary_key=True, index=True)
    email: str = Column(String, unique=True, index=True, nullable=False)
    hashed_password: str = Column(String, nullable=False)
    role: str = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)