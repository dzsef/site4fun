"""Pydantic schemas for job applications."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, validator


class JobApplicationApplyRequest(BaseModel):
    note: str = Field(..., min_length=1, max_length=200)

    @validator("note")
    def _strip_note(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Note cannot be blank")
        return cleaned


class JobApplicationDecisionRequest(BaseModel):
    decision: Literal["accepted", "rejected"]


class JobApplicationOut(BaseModel):
    id: int
    job_posting_id: int
    subcontractor_id: int
    contractor_id: int
    note: Optional[str] = None
    status: Literal["pending", "accepted", "rejected"]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

