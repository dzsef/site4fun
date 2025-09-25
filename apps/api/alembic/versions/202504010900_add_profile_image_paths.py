"""Add image_path columns for profile photos"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "202504010900"
down_revision = "202503021200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contractor_profiles", sa.Column("image_path", sa.String(), nullable=True))
    op.add_column("subcontractor_profiles", sa.Column("image_path", sa.String(), nullable=True))
    op.add_column("homeowner_profiles", sa.Column("image_path", sa.String(), nullable=True))

    op.execute(
        "UPDATE subcontractor_profiles SET image_path = image_url WHERE image_url IS NOT NULL"
    )

    op.drop_column("subcontractor_profiles", "image_url")


def downgrade() -> None:
    op.add_column("subcontractor_profiles", sa.Column("image_url", sa.String(), nullable=True))
    op.execute(
        "UPDATE subcontractor_profiles SET image_url = image_path WHERE image_path IS NOT NULL"
    )

    op.drop_column("homeowner_profiles", "image_path")
    op.drop_column("subcontractor_profiles", "image_path")
    op.drop_column("contractor_profiles", "image_path")
