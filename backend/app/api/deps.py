"""Shared dependencies (admin key, db)."""
from fastapi import Header, HTTPException

from app.core.config import settings


def require_admin_key(x_admin_key: str | None = Header(None, alias="X-ADMIN-KEY")) -> None:
    if not settings.admin_key or x_admin_key != settings.admin_key:
        raise HTTPException(status_code=403, detail="Invalid or missing X-ADMIN-KEY")
