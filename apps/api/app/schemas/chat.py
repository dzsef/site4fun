"""Pydantic schemas for chat conversations and messages."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from ..models.chat import ConversationType, MessageContentType


class ConversationCounterparty(BaseModel):
    user_id: int
    role: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        orm_mode = True


class MessagePayload(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: int
    body: str
    content_type: MessageContentType = MessageContentType.text
    attachment_url: Optional[str] = None
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class ConversationSummary(BaseModel):
    id: UUID
    type: ConversationType
    counterpart: ConversationCounterparty
    last_message: Optional[MessagePayload] = None
    unread_count: int = 0
    updated_at: datetime

    class Config:
        orm_mode = True


class ConversationCreateRequest(BaseModel):
    counterparty_id: int = Field(..., gt=0)


class MessageCreateRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)
    content_type: MessageContentType = MessageContentType.text
    attachment_url: Optional[str] = None


class ReadReceiptRequest(BaseModel):
    message_id: Optional[UUID] = None


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]


class MessageListResponse(BaseModel):
    messages: list[MessagePayload]
    has_more: bool


class ConversationCreatedResponse(BaseModel):
    conversation: ConversationSummary


class MessageCreatedResponse(BaseModel):
    message: MessagePayload


class ReadReceiptResponse(BaseModel):
    conversation_id: UUID
    last_read_message_id: Optional[UUID] = None
    unread_count: int
    read_at: datetime
