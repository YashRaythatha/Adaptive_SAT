"""Session model (practice and exam)."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

import enum
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.skill import SectionEnum

if TYPE_CHECKING:
    from app.models.user import User


class SessionModeEnum(str, enum.Enum):
    PRACTICE = "PRACTICE"
    EXAM = "EXAM"


class SessionStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mode: Mapped[SessionModeEnum] = mapped_column(Enum(SessionModeEnum), nullable=False, index=True)
    status: Mapped[SessionStatusEnum] = mapped_column(Enum(SessionStatusEnum), nullable=False, default=SessionStatusEnum.ACTIVE, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_section: Mapped[SectionEnum | None] = mapped_column(Enum(SectionEnum), nullable=True)
    current_module: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_module_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_module_time_limit_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    practice_domain: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_practice_skill_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="SET NULL"), nullable=True
    )
    current_practice_difficulty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    practice_blueprint_json: Mapped[list | None] = mapped_column(
        JSONB(), nullable=True
    )  # list of question_id (UUIDs as str) for targeted practice, 10-20 cap
    practice_topic: Mapped[str | None] = mapped_column(String(100), nullable=True)

    user = relationship("User", back_populates="sessions")
    attempts = relationship("Attempt", back_populates="session", cascade="all, delete-orphan")
    exam_module_questions = relationship("ExamModuleQuestion", back_populates="session", cascade="all, delete-orphan")
    exam_result = relationship("ExamResult", back_populates="session", uselist=False, cascade="all, delete-orphan")
