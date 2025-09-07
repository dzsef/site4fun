from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

class RFQCreate(BaseModel):
    name: str
    company: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None
    project_type: Optional[str] = None
    budget_range: Optional[str] = None
    start_date: Optional[date] = None
    message: Optional[str] = None

class RFQOut(BaseModel):
    id: int
    name: str
    company: Optional[str]
    email: EmailStr
    phone: Optional[str]
    location: Optional[str]
    project_type: Optional[str]
    budget_range: Optional[str]
    start_date: Optional[date]
    message: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
