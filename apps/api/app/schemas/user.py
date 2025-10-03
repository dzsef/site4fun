"""Pydantic schemas for user input and output.

These classes define the structure of requests to and responses from the
authentication endpoints.
"""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, constr, root_validator, validator


class UserBase(BaseModel):
    email: EmailStr
    role: str


class ContractorLocation(BaseModel):
    country: constr(min_length=1)
    province: Optional[str] = None
    cities: List[str] = Field(default_factory=list)

    @validator("province", pre=True, always=True)
    def _normalize_province(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @validator("cities", pre=True)
    def _normalize_cities(cls, value):
        if value is None:
            return []
        if isinstance(value, str):
            value = [value]
        cleaned = [item.strip() for item in value if isinstance(item, str) and item.strip()]
        if not cleaned:
            raise ValueError("At least one city must be provided")
        return cleaned


class ContractorRegistrationProfile(BaseModel):
    username: constr(min_length=3, max_length=64)
    first_name: constr(min_length=1, max_length=120)
    last_name: constr(min_length=1, max_length=120)
    business_name: constr(min_length=1, max_length=160)
    business_location: ContractorLocation
    birthday: Optional[date] = None
    gender: Optional[str] = None
    years_in_business: Optional[int] = Field(default=None, ge=0, le=150)

    @validator("username", "first_name", "last_name", "business_name")
    def _strip_text_fields(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Value cannot be blank")
        return stripped

    @validator("gender", pre=True, always=True)
    def _normalize_gender(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @validator("birthday")
    def _validate_birthday(cls, value: Optional[date]) -> Optional[date]:
        if value is None:
            return None
        if value >= date.today():
            raise ValueError("Birthday must be in the past")
        return value


class UserCreate(UserBase):
    password: constr(min_length=6)
    contractor_profile: Optional[ContractorRegistrationProfile] = None

    @root_validator
    def _validate_role_requirements(cls, values):
        role = values.get("role")
        contractor_profile = values.get("contractor_profile")
        if role == "contractor":
            if contractor_profile is None:
                raise ValueError("contractor_profile is required for contractor registrations")
        else:
            values["contractor_profile"] = None
        return values


class UserOut(UserBase):
    id: int
    created_at: datetime
    username: Optional[str] = None

    class Config:
        orm_mode = True


class RegistrationResponse(BaseModel):
    message: str


class ConfirmEmailRequest(BaseModel):
    token: constr(min_length=10)
