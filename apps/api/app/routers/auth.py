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
from datetime import date, datetime, timedelta, timezone
from typing import Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
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
        "Thanks for signing up for Site4Fun. To activate your account, please click the link below:\n\n"
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

    normalized_email = user_data.email.strip().lower()

    existing_user_result = await db.execute(select(User).where(User.email == normalized_email))
    if existing_user_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    pending_user_result = await db.execute(
        select(PendingUser).where(PendingUser.email == normalized_email)
    )
    pending_user = pending_user_result.scalar_one_or_none()

    contractor_profile_payload = None
    username = None
    if user_data.role == "contractor":
        if user_data.contractor_profile is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contractor profile data is required",
            )
        username = user_data.contractor_profile.username

        username_result = await db.execute(select(User).where(User.username == username))
        if username_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )

        pending_username_result = await db.execute(
            select(PendingUser).where(PendingUser.username == username)
        )
        existing_pending_username = pending_username_result.scalar_one_or_none()
        if existing_pending_username is not None and existing_pending_username.email != normalized_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )

        contractor_profile_payload = jsonable_encoder(
            {
                "first_name": user_data.contractor_profile.first_name,
                "last_name": user_data.contractor_profile.last_name,
                "business_name": user_data.contractor_profile.business_name,
                "business_location": jsonable_encoder(
                    user_data.contractor_profile.business_location
                ),
                "birthday": user_data.contractor_profile.birthday,
                "gender": user_data.contractor_profile.gender,
                "years_in_business": user_data.contractor_profile.years_in_business,
            }
        )

    hashed_password = hash_password(user_data.password)
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=CONFIRMATION_TOKEN_TTL_HOURS)

    if pending_user:
        pending_user.email = normalized_email
        pending_user.hashed_password = hashed_password
        pending_user.role = user_data.role
        pending_user.token = token
        pending_user.expires_at = expires_at
        pending_user.created_at = now
        pending_user.username = username
        pending_user.profile_payload = contractor_profile_payload
    else:
        pending_user = PendingUser(
            email=normalized_email,
            hashed_password=hashed_password,
            role=user_data.role,
            token=token,
            expires_at=expires_at,
            username=username,
            profile_payload=contractor_profile_payload,
        )
        db.add(pending_user)

    confirmation_link = _build_confirmation_link(token)
    subject, body = _compose_confirmation_email(normalized_email, confirmation_link)

    try:
        await db.flush()
        await send_email(subject, body, normalized_email)
    except EmailDeliveryError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send the confirmation email. Please try again later.",
        ) from exc
    except Exception:
        await db.rollback()
        raise

    await db.commit()

    return RegistrationResponse(
        message="Registration successful! Please confirm your email by clicking the link we sent."
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
            detail="Invalid or expired confirmation token.",
        )

    now = datetime.now(timezone.utc)
    if pending_user.expires_at < now:
        await db.delete(pending_user)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The confirmation token has expired. Please restart the registration process.",
        )

    new_user = User(
        email=pending_user.email,
        hashed_password=pending_user.hashed_password,
        role=pending_user.role,
        username=pending_user.username,
    )
    db.add(new_user)
    await db.flush()

    if new_user.role == "contractor":
        payload = pending_user.profile_payload or {}
        location = payload.get("business_location") or {}
        birthday_value = payload.get("birthday")
        birthday = None
        if birthday_value:
            try:
                birthday = date.fromisoformat(birthday_value)
            except ValueError:
                birthday = None

        first_name = payload.get("first_name")
        last_name = payload.get("last_name")
        business_name = payload.get("business_name")
        raw_country = location.get("country")
        raw_province = location.get("province")
        raw_cities = location.get("cities") or []
        normalized_cities = []
        if isinstance(raw_cities, list):
            seen_city_keys = set()
            for entry in raw_cities:
                if not isinstance(entry, str):
                    continue
                trimmed = entry.strip()
                if not trimmed:
                    continue
                key = trimmed.lower()
                if key in seen_city_keys:
                    continue
                seen_city_keys.add(key)
                normalized_cities.append(trimmed)

        db.add(
            ContractorProfile(
                user_id=new_user.id,
                first_name=first_name.strip() if isinstance(first_name, str) and first_name.strip() else None,
                last_name=last_name.strip() if isinstance(last_name, str) and last_name.strip() else None,
                business_name=business_name.strip() if isinstance(business_name, str) and business_name.strip() else None,
                business_country=raw_country.strip() if isinstance(raw_country, str) and raw_country.strip() else None,
                business_province=raw_province.strip() if isinstance(raw_province, str) and raw_province.strip() else None,
                business_cities=normalized_cities,
                birthday=birthday,
                gender=(payload.get("gender") or None),
                years_in_business=payload.get("years_in_business"),
            )
        )
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
    credential = form_data.username.strip()

    user = None
    if "@" in credential:
        email_candidate = credential.lower()
        result = await db.execute(select(User).where(User.email == email_candidate))
        user = result.scalar_one_or_none()
        if not user:
            # Fallback to the raw credential to support legacy mixed-case records
            result = await db.execute(select(User).where(User.email == credential))
            user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.username == credential))
        user = result.scalar_one_or_none()
    if not user:
        pending_filters = [PendingUser.username == credential]
        if "@" in credential:
            email_candidate = credential.lower()
            pending_filters.append(PendingUser.email == email_candidate)
            pending_filters.append(PendingUser.email == credential)
        pending_result = await db.execute(select(PendingUser).where(or_(*pending_filters)))
        if pending_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please confirm your email before logging in.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")
    token = create_access_token({"sub": user.email, "role": user.role})
    return Token(access_token=token, token_type="bearer")
