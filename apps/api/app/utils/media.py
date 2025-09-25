"""Utility helpers for storing and serving uploaded media files."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

# Allow a focused set of image content types. Extend when needed.
_ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

MEDIA_ROOT = Path(__file__).resolve().parent.parent / "media"
PROFILE_IMAGE_DIR = MEDIA_ROOT / "profile"

MAX_UPLOAD_BYTES = int(os.getenv("PROFILE_IMAGE_MAX_BYTES", str(5 * 1024 * 1024)))
DEFAULT_IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload"


@dataclass
class ImageKitConfig:
    upload_url: str
    public_key: str
    private_key: str
    folder: Optional[str]


_imagekit_config: Optional[ImageKitConfig] = None


def _get_imagekit_config() -> Optional[ImageKitConfig]:
    global _imagekit_config
    if _imagekit_config is not None:
        return _imagekit_config

    private_key = os.getenv("IMAGEKIT_PRIVATE_KEY")
    public_key = os.getenv("IMAGEKIT_PUBLIC_KEY")
    upload_url = os.getenv("IMAGEKIT_UPLOAD_URL", DEFAULT_IMAGEKIT_UPLOAD_URL)
    folder = os.getenv("IMAGEKIT_FOLDER", "/profiles")

    if not private_key or not public_key:
        _imagekit_config = None
        return None

    _imagekit_config = ImageKitConfig(
        upload_url=upload_url,
        public_key=public_key,
        private_key=private_key,
        folder=folder,
    )
    return _imagekit_config


def _ensure_directories() -> None:
    PROFILE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)


def ensure_media_directories() -> None:
    """Public helper to create the expected directory structure if missing."""
    _ensure_directories()


def _extension_for(upload: UploadFile) -> str:
    if upload.content_type in _ALLOWED_IMAGE_TYPES:
        return _ALLOWED_IMAGE_TYPES[upload.content_type]

    if upload.filename:
        _, ext = os.path.splitext(upload.filename)
        if ext.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            return ext.lower().replace(".jpeg", ".jpg")

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported image type. Allowed types: JPEG, PNG, WEBP, GIF.",
    )


def _is_external(path: str) -> bool:
    parsed = urlparse(path)
    return bool(parsed.scheme and parsed.netloc)


def image_path_to_url(image_path: Optional[str]) -> Optional[str]:
    """Convert a stored image reference to a URL path the frontend can use."""
    if not image_path:
        return None
    if _is_external(image_path):
        return image_path
    normalized = image_path.lstrip("/")
    return f"/media/{normalized}" if normalized else None


async def _read_upload_bytes(upload: UploadFile) -> bytes:
    total = 0
    chunks = []
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Profile image is too large. Maximum size is 5 MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


def _build_filename(user_id: int, extension: str, original: Optional[str]) -> str:
    stem = "profile"
    if original:
        stem = Path(original).stem[:40] or stem
    return f"{stem}-{uuid4().hex[:8]}{extension}"


async def _upload_to_imagekit(
    config: ImageKitConfig, user_id: int, upload: UploadFile, file_bytes: bytes
) -> str:
    extension = _extension_for(upload)
    file_name = _build_filename(user_id, extension, upload.filename)

    folder = config.folder or ""
    folder = folder.rstrip("/")
    if folder:
        folder = f"{folder}/{user_id}"
    else:
        folder = f"/profiles/{user_id}"

    data = {
        "fileName": file_name,
        "useUniqueFileName": "true",
        "folder": folder,
    }

    files = {
        "file": (
            file_name,
            file_bytes,
            upload.content_type or "application/octet-stream",
        )
    }

    auth = httpx.BasicAuth(config.private_key, "")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            config.upload_url,
            data=data,
            files=files,
            auth=auth,
        )

    if response.status_code != status.HTTP_200_OK:
        try:
            detail = response.json()
        except Exception:  # pragma: no cover - fallback when JSON parsing fails
            detail = {"detail": response.text}
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "Failed to upload profile image to ImageKit",
                "payload": detail,
            },
        )

    payload = response.json()
    url = payload.get("url")
    if not url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="ImageKit did not return an image URL",
        )
    return url


def _save_local_image(user_id: int, upload: UploadFile, file_bytes: bytes) -> str:
    _ensure_directories()
    extension = _extension_for(upload)
    filename = _build_filename(user_id, extension, upload.filename)

    user_dir = PROFILE_IMAGE_DIR / str(user_id)
    if user_dir.exists():
        for existing in user_dir.iterdir():
            if existing.is_file():
                existing.unlink(missing_ok=True)
    else:
        user_dir.mkdir(parents=True, exist_ok=True)

    target_path = user_dir / filename
    target_path.write_bytes(file_bytes)
    relative_path = target_path.relative_to(MEDIA_ROOT)
    return relative_path.as_posix()


async def save_profile_image(user_id: int, upload: UploadFile) -> str:
    """Persist a profile image for the given user and return a reference string."""
    file_bytes = await _read_upload_bytes(upload)
    try:
        config = _get_imagekit_config()
        if config is not None:
            return await _upload_to_imagekit(config, user_id, upload, file_bytes)
        return _save_local_image(user_id, upload, file_bytes)
    finally:
        await upload.close()


def remove_profile_image(image_path: Optional[str]) -> None:
    """Delete a stored profile image if it lives inside our media directory."""
    if not image_path or _is_external(image_path):
        return
    _ensure_directories()
    candidate = MEDIA_ROOT / image_path
    try:
        candidate.unlink()
    except FileNotFoundError:
        return
    parent = candidate.parent
    if parent != MEDIA_ROOT and parent.is_dir() and not any(parent.iterdir()):
        parent.rmdir()
