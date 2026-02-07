"""add job applications table

Revision ID: 202602071230
Revises: 202506141010
Create Date: 2026-02-07
"""

from alembic import op
import sqlalchemy as sa


revision = "202602071230"
down_revision = "202506141010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_posting_id", sa.Integer(), nullable=False),
        sa.Column("subcontractor_id", sa.Integer(), nullable=False),
        sa.Column("contractor_id", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["job_posting_id"], ["job_postings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subcontractor_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contractor_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "job_posting_id",
            "subcontractor_id",
            name="uq_job_applications_job_posting_subcontractor",
        ),
    )
    op.create_index("ix_job_applications_job_posting_id", "job_applications", ["job_posting_id"], unique=False)
    op.create_index("ix_job_applications_subcontractor_id", "job_applications", ["subcontractor_id"], unique=False)
    op.create_index("ix_job_applications_contractor_id", "job_applications", ["contractor_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_job_applications_contractor_id", table_name="job_applications")
    op.drop_index("ix_job_applications_subcontractor_id", table_name="job_applications")
    op.drop_index("ix_job_applications_job_posting_id", table_name="job_applications")
    op.drop_table("job_applications")

