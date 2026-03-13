"""Exam results (one per exam session)."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.session import Session


class ExamResult(Base):
    __tablename__ = "exam_results"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Correct counts: module 1 & 2 per section, then totals
    rw_module1_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rw_module2_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    math_module1_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    math_module2_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rw_total_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    math_total_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    domain_breakdown_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    rw_scaled: Mapped[int | None] = mapped_column(Integer, nullable=True)
    math_scaled: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_scaled: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    session = relationship("Session", back_populates="exam_result")
    user = relationship("User", back_populates="exam_results")
