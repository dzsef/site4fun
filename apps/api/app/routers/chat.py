"""REST and WebSocket endpoints for contractor-subcontractor messaging."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime
from typing import Any, Iterable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..dependencies import get_current_user
from ..db import AsyncSessionLocal, get_db
from ..models.chat import (
    Conversation,
    ConversationParticipant,
    ConversationType,
    Message,
    MessageContentType,
)
from ..models.user import User
from ..schemas.chat import (
    ConversationCreateRequest,
    ConversationCreatedResponse,
    ConversationListResponse,
    ConversationSummary,
    MessageCreateRequest,
    MessageCreatedResponse,
    MessageListResponse,
    MessagePayload,
    ReadReceiptRequest,
    ReadReceiptResponse,
)
from ..utils.media import image_path_to_url
from ..utils.security import decode_access_token

router = APIRouter(prefix="/chat", tags=["chat"])


class ConnectionManager:
    """Tracks active websocket connections per user."""

    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[user_id].add(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            connections = self._connections.get(user_id)
            if connections and websocket in connections:
                connections.remove(websocket)
            if connections and not connections:
                self._connections.pop(user_id, None)

    async def broadcast(self, user_ids: Iterable[int], payload: dict[str, Any]) -> None:
        message = jsonable_encoder(payload)
        async with self._lock:
            targets = [ws for uid in user_ids for ws in self._connections.get(uid, set())]
        for websocket in targets:
            try:
                await websocket.send_json(message)
            except Exception:
                # Drop broken connections silently; they will reconnect.
                pass


manager = ConnectionManager()


def _display_name(user: User) -> str:
    if user.role == "contractor" and user.contractor_profile:
        profile = user.contractor_profile
        business_name = getattr(profile, "business_name", None)
        if isinstance(business_name, str) and business_name.strip():
            return business_name.strip()
        first_name = getattr(profile, "first_name", None)
        last_name = getattr(profile, "last_name", None)
        combined = " ".join(
            [
                part.strip()
                for part in [first_name, last_name]
                if isinstance(part, str) and part.strip()
            ]
        ).strip()
        if combined:
            return combined
    if user.role == "subcontractor" and user.subcontractor_profile and user.subcontractor_profile.name:
        return user.subcontractor_profile.name
    if user.role == "homeowner" and user.homeowner_profile and user.homeowner_profile.name:
        return user.homeowner_profile.name
    return user.email


async def _load_user(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.contractor_profile),
            selectinload(User.subcontractor_profile),
            selectinload(User.homeowner_profile),
        )
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def _ensure_roles_are_compatible(current_user: User, counterpart: User) -> None:
    pairing = {current_user.role, counterpart.role}
    allowed = {"contractor", "subcontractor"}
    if pairing != allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversations are only supported between contractors and subcontractors",
        )


async def _get_existing_conversation(
    db: AsyncSession, current_user_id: int, counterpart_id: int
) -> Conversation | None:
    subquery = (
        select(ConversationParticipant.conversation_id)
        .where(ConversationParticipant.user_id.in_([current_user_id, counterpart_id]))
        .group_by(ConversationParticipant.conversation_id)
        .having(func.count() == 2)
    )
    result = await db.execute(
        select(Conversation)
        .options(
            selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
            selectinload(Conversation.messages),
        )
        .where(Conversation.id.in_(subquery))
    )
    return result.scalar_one_or_none()


def _serialize_message(message: Message) -> MessagePayload:
    return MessagePayload(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        body=message.body,
        content_type=message.content_type,
        attachment_url=message.attachment_url,
        created_at=message.created_at,
        read_at=message.read_at,
    )


async def _serialize_conversation(
    db: AsyncSession, conversation: Conversation, viewer_id: int
) -> ConversationSummary:
    participants_result = await db.execute(
        select(ConversationParticipant)
        .options(
            selectinload(ConversationParticipant.user).selectinload(User.contractor_profile),
            selectinload(ConversationParticipant.user).selectinload(User.subcontractor_profile),
            selectinload(ConversationParticipant.user).selectinload(User.homeowner_profile),
        )
        .where(ConversationParticipant.conversation_id == conversation.id)
    )
    participant_rows = participants_result.scalars().all()
    participants = {row.user_id: row for row in participant_rows}

    viewer_participant = participants.get(viewer_id)
    if viewer_participant is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")

    counterpart_participant = next(p for uid, p in participants.items() if uid != viewer_id)
    counterpart_user = counterpart_participant.user

    last_message_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_message = last_message_result.scalar_one_or_none()

    counterpart_avatar = None
    if counterpart_user.role == "contractor" and counterpart_user.contractor_profile:
        counterpart_avatar = image_path_to_url(counterpart_user.contractor_profile.image_path)
    elif counterpart_user.role == "subcontractor" and counterpart_user.subcontractor_profile:
        counterpart_avatar = image_path_to_url(counterpart_user.subcontractor_profile.image_path)

    updated_at = last_message.created_at if last_message else conversation.created_at

    return ConversationSummary(
        id=conversation.id,
        type=conversation.type,
        counterpart={
            "user_id": counterpart_user.id,
            "role": counterpart_user.role,
            "name": _display_name(counterpart_user),
            "avatar_url": counterpart_avatar,
        },
        last_message=_serialize_message(last_message) if last_message else None,
        unread_count=viewer_participant.unread_count,
        updated_at=updated_at,
    )


async def _ensure_participant(
    db: AsyncSession, conversation_id: UUID, user_id: int
) -> ConversationParticipant:
    result = await db.execute(
        select(ConversationParticipant)
        .options(selectinload(ConversationParticipant.conversation))
        .where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
    )
    participant = result.scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return participant


@router.post("/conversations", response_model=ConversationCreatedResponse)
async def create_conversation(
    payload: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationCreatedResponse:
    counterpart = await _load_user(db, payload.counterparty_id)
    if counterpart.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot chat with yourself")

    await _ensure_roles_are_compatible(current_user, counterpart)

    existing = await _get_existing_conversation(db, current_user.id, counterpart.id)
    if existing is not None:
        summary = await _serialize_conversation(db, existing, current_user.id)
        return ConversationCreatedResponse(conversation=summary)

    conversation = Conversation(type=ConversationType.contractor_subcontractor)
    db.add(conversation)
    await db.flush()

    participants = [
        ConversationParticipant(
            conversation_id=conversation.id,
            user_id=current_user.id,
            role=current_user.role,
            unread_count=0,
        ),
        ConversationParticipant(
            conversation_id=conversation.id,
            user_id=counterpart.id,
            role=counterpart.role,
            unread_count=0,
        ),
    ]
    db.add_all(participants)
    await db.commit()
    await db.refresh(conversation)

    summary = await _serialize_conversation(db, conversation, current_user.id)
    await manager.broadcast(
        [counterpart.id],
        {
            "event": "conversation.created",
            "conversation": summary.dict(),
        },
    )
    return ConversationCreatedResponse(conversation=summary)


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    result = await db.execute(
        select(Conversation)
        .join(ConversationParticipant)
        .options(selectinload(Conversation.participants).selectinload(ConversationParticipant.user))
        .where(
            ConversationParticipant.user_id == current_user.id,
            ConversationParticipant.is_archived.is_(False),
        )
        .order_by(Conversation.created_at.desc())
    )
    conversations = result.scalars().unique().all()
    summaries = [await _serialize_conversation(db, convo, current_user.id) for convo in conversations]
    summaries.sort(key=lambda item: item.updated_at, reverse=True)
    return ConversationListResponse(conversations=summaries)


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
async def list_messages(
    conversation_id: UUID,
    before_id: UUID | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageListResponse:
    await _ensure_participant(db, conversation_id, current_user.id)

    base_query = select(Message).where(Message.conversation_id == conversation_id)

    if before_id is not None:
        before_message_result = await db.execute(
            select(Message).where(Message.id == before_id, Message.conversation_id == conversation_id)
        )
        before_message = before_message_result.scalar_one_or_none()
        if before_message is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
        base_query = base_query.where(Message.created_at < before_message.created_at)

    result = await db.execute(
        base_query.order_by(Message.created_at.desc()).limit(limit + 1)
    )
    rows = result.scalars().all()
    has_more = len(rows) > limit
    messages = rows[:limit]
    messages_payload = [_serialize_message(message) for message in messages]
    messages_payload.reverse()
    return MessageListResponse(messages=messages_payload, has_more=has_more)


@router.post("/conversations/{conversation_id}/messages", response_model=MessageCreatedResponse)
async def send_message(
    conversation_id: UUID,
    payload: MessageCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageCreatedResponse:
    participant = await _ensure_participant(db, conversation_id, current_user.id)
    conversation = participant.conversation

    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message body cannot be empty")

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        body=body,
        content_type=payload.content_type,
        attachment_url=payload.attachment_url,
    )
    db.add(message)

    recipients_result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id != current_user.id,
        )
    )
    recipients = recipients_result.scalars().all()

    for recipient in recipients:
        recipient.unread_count = (recipient.unread_count or 0) + 1

    await db.commit()
    await db.refresh(message)

    payload_response = _serialize_message(message)
    await manager.broadcast(
        [recipient.user_id for recipient in recipients],
        {
            "event": "message.created",
            "message": payload_response.dict(),
        },
    )
    return MessageCreatedResponse(message=payload_response)


@router.post("/conversations/{conversation_id}/read", response_model=ReadReceiptResponse)
async def mark_conversation_read(
    conversation_id: UUID,
    payload: ReadReceiptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReadReceiptResponse:
    participant = await _ensure_participant(db, conversation_id, current_user.id)
    now = datetime.utcnow()

    last_message_id = payload.message_id
    if last_message_id is None:
        result = await db.execute(
            select(Message.id)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_message_id = result.scalar_one_or_none()

    participant.last_read_message_id = last_message_id
    participant.last_read_at = now
    participant.unread_count = 0

    await db.execute(
        update(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.sender_id != current_user.id,
            Message.read_at.is_(None),
        )
        .values(read_at=now)
    )
    await db.commit()

    recipients_result = await db.execute(
        select(ConversationParticipant.user_id).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id != current_user.id,
        )
    )
    recipient_ids = [row[0] for row in recipients_result.all()]

    await manager.broadcast(
        recipient_ids,
        {
            "event": "conversation.read",
            "conversation_id": str(conversation_id),
            "user_id": current_user.id,
            "message_id": str(last_message_id) if last_message_id else None,
        },
    )

    return ReadReceiptResponse(
        conversation_id=conversation_id,
        last_read_message_id=last_message_id,
        unread_count=0,
        read_at=now,
    )


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)) -> None:
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == payload["sub"]))
        user = result.scalar_one_or_none()
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await manager.connect(user.id, websocket)
    try:
        await websocket.send_json({"event": "connection.established"})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user.id, websocket)
