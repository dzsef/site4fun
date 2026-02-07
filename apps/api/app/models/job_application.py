"""Database model for subcontractor job applications."""

import enum

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship

from ..db import Base


class JobApplicationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False, index=True)
    subcontractor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    contractor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    note = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default=JobApplicationStatus.pending.value)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    job_posting = relationship("JobPosting", lazy="selectin")
    subcontractor = relationship("User", foreign_keys=[subcontractor_id], lazy="selectin")
    contractor = relationship("User", foreign_keys=[contractor_id], lazy="selectin")

    __table_args__ = (
        UniqueConstraint("job_posting_id", "subcontractor_id", name="uq_job_applications_job_posting_subcontractor"),
    )

