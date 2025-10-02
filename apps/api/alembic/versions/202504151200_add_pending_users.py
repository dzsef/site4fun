"""add pending users table

Revision ID: 202504151200
Revises: 202504051000
Create Date: 2025-04-15 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "202504151200_add_pending_users"
down_revision = "202504051000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pending_users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_pending_users_email", "pending_users", ["email"], unique=True)
    op.create_index("ix_pending_users_token", "pending_users", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_pending_users_token", table_name="pending_users")
    op.drop_index("ix_pending_users_email", table_name="pending_users")
    op.drop_table("pending_users")
