"""Routes for subcontractor job applications and contractor decisions."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..dependencies import get_current_user
from ..models.job_application import JobApplication, JobApplicationStatus
from ..models.user import User
from ..schemas.job_application import JobApplicationDecisionRequest, JobApplicationOut

router = APIRouter(prefix="/job-applications", tags=["job-applications"])


def _ensure_contractor(user: User) -> None:
    if user.role != "contractor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only contractors can do that")


@router.post("/{application_id}/decision", response_model=JobApplicationOut)
async def decide_application(
    application_id: int,
    payload: JobApplicationDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobApplicationOut:
    _ensure_contractor(current_user)

    result = await db.execute(select(JobApplication).where(JobApplication.id == application_id))
    application = result.scalar_one_or_none()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.contractor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if application.status != JobApplicationStatus.pending.value:
        return JobApplicationOut.from_orm(application)

    application.status = (
        JobApplicationStatus.accepted.value
        if payload.decision == "accepted"
        else JobApplicationStatus.rejected.value
    )
    await db.commit()
    await db.refresh(application)
    return JobApplicationOut.from_orm(application)

