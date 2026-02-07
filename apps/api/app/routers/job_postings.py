"""Routes for contractor job postings."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..dependencies import get_current_user
from ..models.job_application import JobApplication, JobApplicationStatus
from ..models.job_posting import JobPosting
from ..models.user import User
from ..schemas.job_application import JobApplicationApplyRequest, JobApplicationOut
from ..schemas.job_posting import JobPostingCreate, JobPostingOut

router = APIRouter(prefix="/job-postings", tags=["job-postings"])


def _ensure_contractor(user: User) -> None:
    if user.role != "contractor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only contractors can manage job postings",
        )


def _ensure_subcontractor(user: User) -> None:
    if user.role != "subcontractor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only subcontractors can apply")


@router.post("/", response_model=JobPostingOut, status_code=status.HTTP_201_CREATED)
async def create_job_posting(
    payload: JobPostingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobPostingOut:
    _ensure_contractor(current_user)

    job_posting = JobPosting(
        contractor_id=current_user.id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        required_skills=payload.required_skills,
        requirements=payload.requirements,
        start_date=payload.start_date,
        end_date=payload.end_date,
        location=payload.location,
    )

    db.add(job_posting)
    await db.flush()
    await db.commit()
    await db.refresh(job_posting)

    return JobPostingOut.from_orm(job_posting)


@router.get("/mine", response_model=List[JobPostingOut])
async def list_my_job_postings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[JobPostingOut]:
    _ensure_contractor(current_user)

    result = await db.execute(
        select(JobPosting)
        .where(JobPosting.contractor_id == current_user.id)
        .order_by(JobPosting.created_at.desc())
    )
    postings = result.scalars().all()
    return [JobPostingOut.from_orm(posting) for posting in postings]


@router.get("/", response_model=List[JobPostingOut])
async def list_job_postings(db: AsyncSession = Depends(get_db)) -> List[JobPostingOut]:
    result = await db.execute(select(JobPosting).order_by(JobPosting.created_at.desc()))
    postings = result.scalars().all()
    return [JobPostingOut.from_orm(posting) for posting in postings]


@router.post("/{job_posting_id}/apply", response_model=JobApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_to_job_posting(
    job_posting_id: int,
    payload: JobApplicationApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobApplicationOut:
    _ensure_subcontractor(current_user)

    posting_result = await db.execute(select(JobPosting).where(JobPosting.id == job_posting_id))
    posting = posting_result.scalar_one_or_none()
    if posting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")

    existing_result = await db.execute(
        select(JobApplication).where(
            JobApplication.job_posting_id == posting.id,
            JobApplication.subcontractor_id == current_user.id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        # If they previously applied, keep the latest note, but do not change a non-pending decision.
        if existing.status == JobApplicationStatus.pending.value:
            existing.note = payload.note
            await db.commit()
            await db.refresh(existing)
        return JobApplicationOut.from_orm(existing)

    application = JobApplication(
        job_posting_id=posting.id,
        subcontractor_id=current_user.id,
        contractor_id=posting.contractor_id,
        note=payload.note,
        status=JobApplicationStatus.pending.value,
    )
    db.add(application)
    await db.flush()
    await db.commit()
    await db.refresh(application)
    return JobApplicationOut.from_orm(application)
