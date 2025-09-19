"""
Authentication and user management routes.

This router provides endpoints for user registration and login. Registered
users are stored in the database with a hashed password and an associated role.
On successful login, a JSON Web Token (JWT) is returned that includes the
user's email and role in its payload. Clients should include this token in
subsequent requests for authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..db import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserOut
from ..utils.security import hash_password, verify_password, create_access_token

from pydantic import BaseModel

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)) -> UserOut:
    """
    Register a new user.

    This endpoint hashes the provided password, checks for duplicate emails, stores the user
    in the database and returns the newly created user without the password.
    """
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    hashed = hash_password(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed, role=user_data.role)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


class Token(BaseModel):
    access_token: str
    token_type: str


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)) -> Token:
    """
    Authenticate a user and return a JWT.

    The form must supply `username` (which we interpret as email) and `password`. If
    authentication succeeds, the user receives a Bearer token containing their email
    and role. Otherwise, a 400 error is returned.
    """
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")
    token = create_access_token({"sub": user.email, "role": user.role})
    return Token(access_token=token, token_type="bearer")