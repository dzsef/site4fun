"""Profile management routes for authenticated users."""

from decimal import Decimal
from typing import List, Sequence, Union

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..dependencies import get_current_user
from ..db import get_db
from ..models.profile import (
    ContractorProfile,
    HomeownerProfile,
    SubcontractorAvailability,
    SubcontractorProfile,
)
from ..models.user import User
from ..schemas.profile import (
    AvailabilitySlot,
    ContractorProfileData,
    ContractorProfileEnvelope,
    HomeownerProfileData,
    HomeownerProfileEnvelope,
    ProfileResponse,
    ProfileUpdateRequest,
    SubcontractorProfileData,
    SubcontractorProfileEnvelope,
    SubcontractorDirectoryCard,
)
from ..utils.media import image_path_to_url, save_profile_image

router = APIRouter()


async def _contractor_response(user: User, db: AsyncSession) -> ContractorProfileEnvelope:
    profile = await db.get(ContractorProfile, user.id)
    if profile is None:
        data = ContractorProfileData()
    else:
        data = ContractorProfileData(
            name=profile.name,
            country=profile.country,
            city=profile.city,
            company_name=profile.company_name,
            image_url=image_path_to_url(profile.image_path),
        )
    return ContractorProfileEnvelope(role="contractor", profile=data)


async def _subcontractor_response(user: User, db: AsyncSession) -> SubcontractorProfileEnvelope:
    profile = await db.get(SubcontractorProfile, user.id)
    if profile is None:
        data = SubcontractorProfileData()
    else:
        result = await db.execute(
            select(SubcontractorAvailability)
            .where(SubcontractorAvailability.profile_id == user.id)
            .order_by(SubcontractorAvailability.date, SubcontractorAvailability.start_time)
        )
        slots = result.scalars().all()
        data = SubcontractorProfileData(
            name=profile.name,
            bio=profile.bio,
            skills=list(profile.skills or []),
            services=list(profile.services or []),
            years_of_experience=profile.years_of_experience,
            rates=float(profile.rates) if profile.rates is not None else None,
            area=profile.area,
            image_url=image_path_to_url(profile.image_path),
            availability=[AvailabilitySlot.from_orm(slot) for slot in slots] if slots else [],
        )
    return SubcontractorProfileEnvelope(role="subcontractor", profile=data)


async def _homeowner_response(user: User, db: AsyncSession) -> HomeownerProfileEnvelope:
    profile = await db.get(HomeownerProfile, user.id)
    if profile is None:
        data = HomeownerProfileData()
    else:
        data = HomeownerProfileData(
            name=profile.name,
            city=profile.city,
            investment_min=float(profile.investment_min) if profile.investment_min is not None else None,
            investment_max=float(profile.investment_max) if profile.investment_max is not None else None,
            image_url=image_path_to_url(profile.image_path),
        )
    return HomeownerProfileEnvelope(role="homeowner", profile=data)


async def _serialize_profile(user: User, db: AsyncSession) -> ProfileResponse:
    if user.role == "contractor":
        return await _contractor_response(user, db)
    if user.role == "subcontractor":
        return await _subcontractor_response(user, db)
    if user.role == "homeowner":
        return await _homeowner_response(user, db)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported role")


@router.get("/me", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    return await _serialize_profile(current_user, db)


def _validate_subcontractor_availability(slots: Sequence) -> None:
    for slot in slots:
        if slot.start_time >= slot.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Availability start time must be before end time",
            )


@router.put("/me", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    if payload.role != current_user.role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role mismatch")

    if current_user.role == "contractor":
        profile = await db.get(ContractorProfile, current_user.id)
        if profile is None:
            profile = ContractorProfile(user_id=current_user.id)
            db.add(profile)
        profile.name = payload.profile.name
        profile.country = payload.profile.country
        profile.city = payload.profile.city
        profile.company_name = payload.profile.company_name
        # Preserve existing image_path for contractor profiles; updates happen via the avatar endpoint.
        await db.commit()
        await db.refresh(profile)
        return await _contractor_response(current_user, db)

    if current_user.role == "subcontractor":
        profile = await db.get(SubcontractorProfile, current_user.id)
        if profile is None:
            profile = SubcontractorProfile(user_id=current_user.id, skills=[], services=[])
            db.add(profile)
        data = payload.profile
        if data.years_of_experience is not None and data.years_of_experience < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Years of experience cannot be negative",
            )
        if data.rates is not None and data.rates < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rates cannot be negative",
            )
        _validate_subcontractor_availability(data.availability)

        profile.bio = data.bio.strip() if data.bio else None
        profile.name = data.name.strip() if data.name else None
        profile.skills = [skill.strip() for skill in data.skills if skill.strip()]
        profile.services = [service.strip() for service in data.services if service.strip()]
        profile.years_of_experience = data.years_of_experience
        profile.rates = Decimal(str(data.rates)) if data.rates is not None else None
        profile.area = data.area.strip() if data.area else None

        result = await db.execute(
            select(SubcontractorAvailability).where(SubcontractorAvailability.profile_id == current_user.id)
        )
        for slot in result.scalars().all():
            await db.delete(slot)
        await db.flush()
        for slot in data.availability:
            db.add(
                SubcontractorAvailability(
                    profile_id=current_user.id,
                    date=slot.date,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                )
            )

        await db.commit()
        return await _subcontractor_response(current_user, db)

    if current_user.role == "homeowner":
        profile = await db.get(HomeownerProfile, current_user.id)
        if profile is None:
            profile = HomeownerProfile(user_id=current_user.id)
            db.add(profile)
        data = payload.profile
        if (
            data.investment_min is not None
            and data.investment_max is not None
            and data.investment_min > data.investment_max
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum investment cannot exceed maximum investment",
            )
        profile.name = data.name
        profile.city = data.city
        profile.investment_min = Decimal(str(data.investment_min)) if data.investment_min is not None else None
        profile.investment_max = Decimal(str(data.investment_max)) if data.investment_max is not None else None
        # Image updates for homeowners happen via the avatar endpoint.
        await db.commit()
        await db.refresh(profile)
        return await _homeowner_response(current_user, db)

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported role")


@router.get("/subcontractors", response_model=List[SubcontractorDirectoryCard])
async def list_subcontractors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SubcontractorDirectoryCard]:
    if current_user.role != "contractor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contractor role required")

    result = await db.execute(select(SubcontractorProfile))
    profiles = sorted(result.scalars().all(), key=lambda profile: (profile.name or "").lower())

    cards = [
        SubcontractorDirectoryCard(
            user_id=profile.user_id,
            name=profile.name,
            bio=profile.bio,
            area=profile.area,
            years_of_experience=profile.years_of_experience,
            skills=list(profile.skills or []),
            services=list(profile.services or []),
            image_url=image_path_to_url(profile.image_path),
        )
        for profile in profiles
    ]

    return cards


async def _get_or_create_profile(
    user: User, db: AsyncSession
) -> Union[ContractorProfile, SubcontractorProfile, HomeownerProfile]:
    if user.role == "contractor":
        profile = await db.get(ContractorProfile, user.id)
        if profile is None:
            profile = ContractorProfile(user_id=user.id)
            db.add(profile)
            await db.flush()
        return profile

    if user.role == "subcontractor":
        profile = await db.get(SubcontractorProfile, user.id)
        if profile is None:
            profile = SubcontractorProfile(user_id=user.id, skills=[], services=[])
            db.add(profile)
            await db.flush()
        return profile

    if user.role == "homeowner":
        profile = await db.get(HomeownerProfile, user.id)
        if profile is None:
            profile = HomeownerProfile(user_id=user.id)
            db.add(profile)
            await db.flush()
        return profile

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported role")


@router.post("/me/avatar", response_model=ProfileResponse)
async def upload_profile_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    profile = await _get_or_create_profile(current_user, db)
    image_path = await save_profile_image(current_user.id, file)
    profile.image_path = image_path
    await db.commit()
    return await _serialize_profile(current_user, db)
