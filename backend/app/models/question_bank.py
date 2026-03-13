"""Question bank model."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

import enum
from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.skill import SectionEnum

if TYPE_CHECKING:
    from app.models.skill import Skill


class QualityStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    section: Mapped[SectionEnum] = mapped_column(Enum(SectionEnum), nullable=False, index=True)
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True
    )
    difficulty_llm: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    choices_json: Mapped[dict] = mapped_column(JSONB, nullable=False)  # list of choices
    correct_answer: Mapped[str] = mapped_column(String(500), nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    quality_status: Mapped[QualityStatusEnum] = mapped_column(
        Enum(QualityStatusEnum), nullable=False, default=QualityStatusEnum.DRAFT, index=True
    )
    source_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    skill = relationship("Skill", back_populates="questions")

    __table_args__ = (
        Index("ix_question_bank_section_skill_difficulty_status", "section", "skill_id", "difficulty_llm", "quality_status"),
    )
