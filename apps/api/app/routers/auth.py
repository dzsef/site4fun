"""
Authentication and user management routes.

This router provides endpoints for user registration and login. Registered
users are stored in the database with a hashed password and an associated role.
On successful login, a JSON Web Token (JWT) is returned that includes the
user's email and role in its payload. Clients should include this token in
subsequent requests for authentication.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..db import get_db
from ..models.user import User, PendingUser
from ..models.profile import (
    ContractorProfile,
    HomeownerProfile,
    SubcontractorProfile,
)
from ..schemas.user import (
    ConfirmEmailRequest,
    RegistrationResponse,
    UserCreate,
    UserOut,
)
from ..utils.security import hash_password, verify_password, create_access_token
from ..utils.email import send_email, EmailDeliveryError

from pydantic import BaseModel
from dotenv import load_dotenv

router = APIRouter()

load_dotenv()

CONFIRMATION_TOKEN_TTL_HOURS = int(os.getenv("EMAIL_CONFIRMATION_TTL_HOURS", "48"))
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")


def _build_confirmation_link(token: str) -> str:
    return f"{FRONTEND_BASE_URL}/verify-email?token={token}"


def _compose_confirmation_email(recipient_email: str, confirmation_link: str) -> Tuple[str, str]:
    subject = "Confirm your Site4Fun registration"
    body = (
        "Hi there!\n\n"
        "Thanks for signing up for Osus. To activate your account, please click the link below:\n\n"
        f"{confirmation_link}\n\n"
        "This link will stay valid for "
        f"{CONFIRMATION_TOKEN_TTL_HOURS} hours.\n\n"
        "If you didn't start this registration, you can safely ignore this message.\n\n"
        "Cheers,\n"
        "The Site4Fun Team"
    )
    return subject, body


@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> RegistrationResponse:
    """Start the registration flow by sending an email verification link."""

    existing_user_result = await db.execute(select(User).where(User.email == user_data.email))
    if existing_user_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    pending_user_result = await db.execute(
        select(PendingUser).where(PendingUser.email == user_data.email)
    )
    pending_user = pending_user_result.scalar_one_or_none()

    hashed_password = hash_password(user_data.password)
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=CONFIRMATION_TOKEN_TTL_HOURS)

    if pending_user:
        pending_user.hashed_password = hashed_password
        pending_user.role = user_data.role
        pending_user.token = token
        pending_user.expires_at = expires_at
        pending_user.created_at = now
    else:
        pending_user = PendingUser(
            email=user_data.email,
            hashed_password=hashed_password,
            role=user_data.role,
            token=token,
            expires_at=expires_at,
        )
        db.add(pending_user)

    confirmation_link = _build_confirmation_link(token)
    subject, body = _compose_confirmation_email(user_data.email, confirmation_link)

    try:
        await db.flush()
        await send_email(subject, body, user_data.email)
    except EmailDeliveryError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Nem sikerült elküldeni a megerősítő emailt. Kérjük próbáld meg később.",
        ) from exc
    except Exception:
        await db.rollback()
        raise

    await db.commit()

    return RegistrationResponse(
        message="Sikeres regisztráció! Kérjük erősítsd meg az emailed a kapott linkre kattintva."
    )


@router.post("/confirm", response_model=UserOut)
async def confirm_registration(
    payload: ConfirmEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Confirm a registration token and create the user account."""

    result = await db.execute(select(PendingUser).where(PendingUser.token == payload.token))
    pending_user = result.scalar_one_or_none()
    if pending_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Érvénytelen vagy lejárt megerősítő token.",
        )

    now = datetime.now(timezone.utc)
    if pending_user.expires_at < now:
        await db.delete(pending_user)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A megerősítő token lejárt. Kérjük kezdd újra a regisztrációt.",
        )

    new_user = User(
        email=pending_user.email,
        hashed_password=pending_user.hashed_password,
        role=pending_user.role,
    )
    db.add(new_user)
    await db.flush()

    if new_user.role == "contractor":
        db.add(ContractorProfile(user_id=new_user.id))
    elif new_user.role == "subcontractor":
        db.add(SubcontractorProfile(user_id=new_user.id, skills=[], services=[]))
    elif new_user.role == "homeowner":
        db.add(HomeownerProfile(user_id=new_user.id))

    await db.delete(pending_user)
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
    if not user:
        pending_result = await db.execute(
            select(PendingUser).where(PendingUser.email == form_data.username)
        )
        if pending_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A bejelentkezéshez előbb erősítsd meg az emailed.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")
    token = create_access_token({"sub": user.email, "role": user.role})
    return Token(access_token=token, token_type="bearer")
