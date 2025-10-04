"""Pydantic schemas for role-based user profiles."""

from datetime import date, time
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field, EmailStr, validator

from .user import SUPPORTED_COUNTRIES


class AvailabilitySlot(BaseModel):
    date: date
    start_time: time
    end_time: time

    class Config:
        orm_mode = True


class BusinessLocation(BaseModel):
    country: str
    provinces: List[str] = Field(default_factory=list)
    cities: List[str] = Field(default_factory=list)

    @validator("country")
    def _validate_country(cls, value: str) -> str:
        cleaned = value.strip().upper()
        if not cleaned:
            raise ValueError("country cannot be empty")
        if cleaned not in SUPPORTED_COUNTRIES:
            raise ValueError("Unsupported country")
        return cleaned

    @validator("provinces", pre=True, always=True)
    def _normalize_provinces(cls, value, values):
        if value is None:
            return []
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list):
            raise ValueError("Invalid provinces list")

        country = values.get("country")
        allowed = SUPPORTED_COUNTRIES.get(country, set()) if country else set()
        normalized: List[str] = []
        seen = set()
        for item in value:
            if not isinstance(item, str):
                raise ValueError("Province must be a string")
            cleaned = item.strip().upper()
            if not cleaned:
                continue
            if country and allowed and cleaned not in allowed:
                raise ValueError("Province/territory not available for the selected country")
            if cleaned in seen:
                continue
            seen.add(cleaned)
            normalized.append(cleaned)
        return normalized

    @validator("cities", each_item=True)
    def _validate_cities(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("city entries cannot be blank")
        return cleaned


class ContractorProfileData(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    business_name: Optional[str] = None
    business_location: Optional[BusinessLocation] = None
    birthday: Optional[date] = None
    gender: Optional[str] = None
    years_in_business: Optional[int] = None
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
    email: Optional[EmailStr] = None
    username: Optional[str] = None


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
