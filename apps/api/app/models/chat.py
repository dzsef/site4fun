"""Messaging domain models for conversations and messages."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..db import Base


class ConversationType(str, enum.Enum):
    contractor_subcontractor = "contractor_subcontractor"


class MessageContentType(str, enum.Enum):
    text = "text"
    image = "image"
    file = "file"
    system = "system"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    type = Column(Enum(ConversationType, name="conversation_type"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    participants = relationship(
        "ConversationParticipant",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="desc(Message.created_at)",
        lazy="selectin",
    )


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String, nullable=False)
    joined_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    last_read_message_id = Column(UUID(as_uuid=True), nullable=True)
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    unread_count = Column(Integer, nullable=False, default=0)
    is_archived = Column(Boolean, nullable=False, default=False)

    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", lazy="selectin")

    __table_args__ = (
        CheckConstraint("unread_count >= 0", name="conversation_participants_unread_nonnegative"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = Column(Text, nullable=False)
    content_type = Column(
        Enum(MessageContentType, name="message_content_type"),
        nullable=False,
        default=MessageContentType.text,
    )
    attachment_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("conversation_id", "id", name="uq_messages_conversation_id_id"),
    )
