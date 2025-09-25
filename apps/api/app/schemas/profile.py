"""Pydantic schemas for role-based user profiles."""

from datetime import date, time
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field


class AvailabilitySlot(BaseModel):
    date: date
    start_time: time
    end_time: time

    class Config:
        orm_mode = True


class ContractorProfileData(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    company_name: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        orm_mode = True


class SubcontractorProfileData(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    services: List[str] = Field(default_factory=list)
    years_of_experience: Optional[int] = None
    rates: Optional[float] = None
    area: Optional[str] = None
    image_url: Optional[str] = None
    availability: List[AvailabilitySlot] = Field(default_factory=list)

    class Config:
        orm_mode = True


class HomeownerProfileData(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    investment_min: Optional[float] = None
    investment_max: Optional[float] = None
    image_url: Optional[str] = None

    class Config:
        orm_mode = True


class ContractorProfileEnvelope(BaseModel):
    role: Literal["contractor"]
    profile: ContractorProfileData


class SubcontractorProfileEnvelope(BaseModel):
    role: Literal["subcontractor"]
    profile: SubcontractorProfileData


class HomeownerProfileEnvelope(BaseModel):
    role: Literal["homeowner"]
    profile: HomeownerProfileData


class SubcontractorDirectoryCard(BaseModel):
    user_id: int
    name: Optional[str] = None
    bio: Optional[str] = None
    area: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: List[str] = Field(default_factory=list)
    services: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None

    class Config:
        orm_mode = True


ProfileResponse = Union[
    ContractorProfileEnvelope,
    SubcontractorProfileEnvelope,
    HomeownerProfileEnvelope,
]

ProfileUpdateRequest = Union[
    ContractorProfileEnvelope,
    SubcontractorProfileEnvelope,
    HomeownerProfileEnvelope,
]
