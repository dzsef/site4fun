"""add messaging tables for conversations"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "202504051000"
down_revision = "202504010900"
branch_labels = None
depends_on = None


conversation_type = postgresql.ENUM(
    "contractor_subcontractor",
    name="conversation_type",
)

message_content_type = postgresql.ENUM(
    "text",
    "image",
    "file",
    "system",
    name="message_content_type",
)

conversation_type_no_create = postgresql.ENUM(
    "contractor_subcontractor",
    name="conversation_type",
    create_type=False,
)

message_content_type_no_create = postgresql.ENUM(
    "text",
    "image",
    "file",
    "system",
    name="message_content_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    conversation_type.create(bind, checkfirst=True)
    message_content_type.create(bind, checkfirst=True)

    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("type", conversation_type_no_create, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "conversation_participants",
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_read_message_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unread_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint("unread_count >= 0", name="conversation_participants_unread_nonnegative"),
        sa.PrimaryKeyConstraint("conversation_id", "user_id"),
    )
    op.create_index(
        "ix_conversation_participants_user_id",
        "conversation_participants",
        ["user_id"],
    )

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("content_type", message_content_type_no_create, nullable=False, server_default="text"),
        sa.Column("attachment_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_messages_conversation_created_at",
        "messages",
        ["conversation_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_messages_conversation_created_at", table_name="messages")
    op.drop_table("messages")

    op.drop_index("ix_conversation_participants_user_id", table_name="conversation_participants")
    op.drop_table("conversation_participants")

    op.drop_table("conversations")

    bind = op.get_bind()
    message_content_type.drop(bind, checkfirst=True)
    conversation_type.drop(bind, checkfirst=True)
