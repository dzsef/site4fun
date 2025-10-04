"""convert contractor province to array"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "202505010930"
down_revision = "9793667791e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("contractor_profiles")}

    needs_json_column = "business_provinces" not in columns
    has_legacy_column = "business_province" in columns

    if has_legacy_column and needs_json_column:
        op.add_column(
            "contractor_profiles",
            sa.Column(
                "business_provinces",
                postgresql.JSONB(astext_type=sa.Text()),
                server_default=sa.text("'[]'::jsonb"),
                nullable=False,
            ),
        )
    elif needs_json_column:
        op.add_column(
            "contractor_profiles",
            sa.Column(
                "business_provinces",
                postgresql.JSONB(astext_type=sa.Text()),
                server_default=sa.text("'[]'::jsonb"),
                nullable=False,
            ),
        )

    if has_legacy_column:
        op.execute(
            """
            UPDATE contractor_profiles
            SET business_provinces = CASE
                WHEN business_province IS NULL OR trim(business_province) = '' THEN '[]'::jsonb
                ELSE jsonb_build_array(upper(trim(business_province)))
            END
            """
        )
        op.drop_column("contractor_profiles", "business_province")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("contractor_profiles")}

    has_json_column = "business_provinces" in columns
    has_string_column = "business_province" in columns

    if not has_string_column:
        op.add_column("contractor_profiles", sa.Column("business_province", sa.String(), nullable=True))

    if has_json_column:
        op.execute(
            """
            UPDATE contractor_profiles
            SET business_province = CASE
                WHEN jsonb_array_length(business_provinces) > 0 THEN business_provinces->>0
                ELSE NULL
            END
            """
        )
        op.drop_column("contractor_profiles", "business_provinces")
