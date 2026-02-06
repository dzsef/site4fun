"""Pydantic schemas for contractor job postings."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, root_validator, validator


class JobPostingBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=20)
    required_skills: List[str] = Field(..., min_items=1)
    requirements: Optional[str] = Field(default=None, max_length=4000)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    location: Optional[str] = Field(default=None, max_length=160)

    @validator("required_skills", pre=True)
    def _normalize_skills(cls, value):
        if value is None:
            raise ValueError("At least one skill is required")
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list):
            raise ValueError("Skills must be provided as a list")
        normalized: List[str] = []
        seen = set()
        for item in value:
            if not isinstance(item, str):
                raise ValueError("Skill entries must be strings")
            cleaned = item.strip()
            if not cleaned:
                continue
            key = cleaned.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(cleaned)
        if not normalized:
            raise ValueError("At least one skill is required")
        return normalized

    @validator("requirements")
    def _clean_requirements(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @validator("location")
    def _clean_location(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @root_validator
    def _validate_timeframe(cls, values):
        start = values.get("start_date")
        end = values.get("end_date")
        if start and end and end < start:
            raise ValueError("end_date must be on or after start_date")
        return values


class JobPostingCreate(JobPostingBase):
    pass


class JobPostingOut(JobPostingBase):
    id: int
    contractor_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
