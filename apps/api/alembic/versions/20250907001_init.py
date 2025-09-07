from alembic import op
import sqlalchemy as sa

revision = '20250907001_init'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(length=320), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    op.create_table(
        'rfqs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('company', sa.String(length=200)),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('phone', sa.String(length=50)),
        sa.Column('location', sa.String(length=200)),
        sa.Column('project_type', sa.String(length=120)),
        sa.Column('budget_range', sa.String(length=120)),
        sa.Column('start_date', sa.Date()),
        sa.Column('message', sa.Text()),
        sa.Column('status', sa.String(length=30), server_default='new', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('rfqs')
    op.drop_table('users')
