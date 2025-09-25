"""add name and image_url to subcontractor profile"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '202503021200'
down_revision = '86b7cdc4a7c5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('subcontractor_profiles', sa.Column('name', sa.String(), nullable=True))
    op.add_column('subcontractor_profiles', sa.Column('image_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('subcontractor_profiles', 'image_url')
    op.drop_column('subcontractor_profiles', 'name')
