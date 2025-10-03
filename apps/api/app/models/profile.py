"""Role-specific user profile models."""

from sqlalchemy import (
    Column,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from ..db import Base


class ContractorProfile(Base):
    __tablename__ = "contractor_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    business_name = Column(String, nullable=True)
    business_country = Column(String, nullable=True)
    business_province = Column(String, nullable=True)
    business_cities = Column(JSONB, nullable=False, server_default="[]", default=list)
    birthday = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    years_in_business = Column(Integer, nullable=True)
    image_path = Column(String, nullable=True)

    user = relationship("User", back_populates="contractor_profile")


class SubcontractorProfile(Base):
    __tablename__ = "subcontractor_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(JSONB, nullable=False, server_default="[]", default=list)
    services = Column(JSONB, nullable=False, server_default="[]", default=list)
    years_of_experience = Column(Integer, nullable=True)
    rates = Column(Numeric(10, 2), nullable=True)
    area = Column(String, nullable=True)
    image_path = Column(String, nullable=True)

    user = relationship("User", back_populates="subcontractor_profile")
    availability = relationship(
        "SubcontractorAvailability",
        back_populates="profile",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SubcontractorAvailability(Base):
    __tablename__ = "subcontractor_availability"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(
        Integer,
        ForeignKey("subcontractor_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    profile = relationship("SubcontractorProfile", back_populates="availability")


class HomeownerProfile(Base):
    __tablename__ = "homeowner_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    name = Column(String, nullable=True)
    city = Column(String, nullable=True)
    investment_min = Column(Numeric(12, 2), nullable=True)
    investment_max = Column(Numeric(12, 2), nullable=True)
    image_path = Column(String, nullable=True)

    user = relationship("User", back_populates="homeowner_profile")
