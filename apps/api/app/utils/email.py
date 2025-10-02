"""Utility helpers for sending transactional emails."""

from __future__ import annotations

import asyncio
import os
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class EmailDeliveryError(RuntimeError):
    """Raised when an email cannot be delivered."""


@dataclass(frozen=True)
class EmailSettings:
    host: str
    port: int
    username: str
    password: str
    sender: str
    use_tls: bool


@lru_cache(maxsize=1)
def get_email_settings() -> EmailSettings:
    """Read SMTP configuration from environment variables."""

    host = os.getenv("SMTP_HOST")
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("EMAIL_SENDER")

    if not host or not sender:
        raise EmailDeliveryError("SMTP_HOST and EMAIL_SENDER environment variables must be set")

    port = int(os.getenv("SMTP_PORT", "587"))
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() not in {"0", "false", "no"}

    # Username/password can be optional for unauthenticated SMTP relays
    if (username and not password) or (password and not username):
        raise EmailDeliveryError("SMTP_USERNAME and SMTP_PASSWORD must both be provided or omitted")

    return EmailSettings(
        host=host,
        port=port,
        username=username or "",
        password=password or "",
        sender=sender,
        use_tls=use_tls,
    )


async def send_email(subject: str, body: str, recipient: str) -> None:
    """Send an email using the configured SMTP server."""

    settings = get_email_settings()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.sender
    message["To"] = recipient
    message.set_content(body)

    def _deliver() -> None:
        with smtplib.SMTP(settings.host, settings.port, timeout=30) as server:
            if settings.use_tls:
                server.starttls()
            if settings.username:
                server.login(settings.username, settings.password)
            server.send_message(message)

    try:
        await asyncio.to_thread(_deliver)
    except Exception as exc:  # pragma: no cover - passthrough for operational issues
        raise EmailDeliveryError(str(exc)) from exc
