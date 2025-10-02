"""
Pydantic schemas for user input and output. These classes define the
structure of requests to and responses from the authentication endpoints.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr, constr


class UserBase(BaseModel):
    email: EmailStr
    role: str


class UserCreate(UserBase):
    password: constr(min_length=6)


class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class RegistrationResponse(BaseModel):
    message: str


class ConfirmEmailRequest(BaseModel):
    token: constr(min_length=10)
