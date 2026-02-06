"""
SQLAlchemy model for users. Each user has an email, a hashed password,
a role indicating whether they are a homeowner, contractor, subcontractor, or specialist,
and a timestamp of when they were created.
"""

from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from ..db import Base


class User(Base):
    __tablename__ = "users"

    id: int = Column(Integer, primary_key=True, index=True)
    email: str = Column(String, unique=True, index=True, nullable=False)
    hashed_password: str = Column(String, nullable=False)
    role: str = Column(String, nullable=False)
    username: str = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    contractor_profile = relationship(
        "ContractorProfile",
        back_populates="user",
        uselist=False,
        lazy="selectin",
    )
    specialist_profile = relationship(
        "SpecialistProfile",
        back_populates="user",
        uselist=False,
        lazy="selectin",
    )
    subcontractor_profile = relationship(
        "SubcontractorProfile",
        back_populates="user",
        uselist=False,
        lazy="selectin",
    )
    homeowner_profile = relationship(
        "HomeownerProfile",
        back_populates="user",
        uselist=False,
        lazy="selectin",
    )
    job_postings = relationship(
        "JobPosting",
        back_populates="contractor",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class PendingUser(Base):
    """Temporary storage for users awaiting email confirmation."""

    __tablename__ = "pending_users"

    id: int = Column(Integer, primary_key=True, index=True)
    email: str = Column(String, unique=True, index=True, nullable=False)
    hashed_password: str = Column(String, nullable=False)
    role: str = Column(String, nullable=False)
    username: str = Column(String, unique=True, index=True, nullable=True)
    profile_payload = Column(JSONB, nullable=True)
    token: str = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
