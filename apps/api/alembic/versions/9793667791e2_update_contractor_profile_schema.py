"""update contractor profile schema"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "9793667791e2"
down_revision = "202504151200_add_pending_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users table additions
    op.add_column("users", sa.Column("username", sa.String(), nullable=True))
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # normalize stored emails for consistent login comparisons
    op.execute("UPDATE users SET email = lower(trim(email))")
    op.execute("UPDATE pending_users SET email = lower(trim(email))")

    # pending_users additions
    op.add_column("pending_users", sa.Column("username", sa.String(), nullable=True))
    op.add_column(
        "pending_users",
        sa.Column("profile_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index("ix_pending_users_username", "pending_users", ["username"], unique=True)

    # contractor_profiles restructuring
    op.add_column("contractor_profiles", sa.Column("first_name", sa.String(), nullable=True))
    op.add_column("contractor_profiles", sa.Column("last_name", sa.String(), nullable=True))
    op.add_column("contractor_profiles", sa.Column("business_name", sa.String(), nullable=True))
    op.add_column("contractor_profiles", sa.Column("business_country", sa.String(), nullable=True))
    op.add_column("contractor_profiles", sa.Column("business_province", sa.String(), nullable=True))
    op.add_column(
        "contractor_profiles",
        sa.Column(
            "business_cities",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column("contractor_profiles", sa.Column("birthday", sa.Date(), nullable=True))
    op.add_column("contractor_profiles", sa.Column("gender", sa.String(), nullable=True))
    op.add_column("contractor_profiles", sa.Column("years_in_business", sa.Integer(), nullable=True))

    # migrate existing data
    op.execute(
        """
        UPDATE contractor_profiles
        SET
            first_name = name,
            business_name = company_name,
            business_country = country,
            business_cities = CASE
                WHEN city IS NULL OR trim(city) = '' THEN '[]'::jsonb
                ELSE jsonb_build_array(city)
            END
        """
    )

    # drop obsolete columns
    op.drop_column("contractor_profiles", "name")
    op.drop_column("contractor_profiles", "country")
    op.drop_column("contractor_profiles", "city")
    op.drop_column("contractor_profiles", "company_name")


def downgrade() -> None:
    # restore contractor profile columns
    op.add_column("contractor_profiles", sa.Column("company_name", sa.String(), nullable=True))
    op.add_column("contractor_profiles", sa.Column("city", sa.String(), nullable=True))
    op.add_column("contractor_profiles", sa.Column("country", sa.String(), nullable=True))
    op.add_column("contractor_profiles", sa.Column("name", sa.String(), nullable=True))

    op.execute(
        """
        UPDATE contractor_profiles
        SET
            name = COALESCE(first_name, name),
            company_name = COALESCE(business_name, company_name),
            country = COALESCE(business_country, country),
            city = CASE
                WHEN jsonb_array_length(business_cities) > 0 THEN business_cities->>0
                ELSE city
            END
        """
    )

    op.drop_column("contractor_profiles", "years_in_business")
    op.drop_column("contractor_profiles", "gender")
    op.drop_column("contractor_profiles", "birthday")
    op.drop_column("contractor_profiles", "business_cities")
    op.drop_column("contractor_profiles", "business_province")
    op.drop_column("contractor_profiles", "business_country")
    op.drop_column("contractor_profiles", "business_name")
    op.drop_column("contractor_profiles", "last_name")
    op.drop_column("contractor_profiles", "first_name")

    op.drop_index("ix_pending_users_username", table_name="pending_users")
    op.drop_column("pending_users", "profile_payload")
    op.drop_column("pending_users", "username")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "username")
