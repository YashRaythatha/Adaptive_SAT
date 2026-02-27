"""Exam module question assignment (ordering within exam modules)."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

import enum
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.skill import SectionEnum

if TYPE_CHECKING:
    from app.models.question_bank import QuestionBank
    from app.models.session import Session


class ExamQuestionStatusEnum(str, enum.Enum):
    UNSEEN = "UNSEEN"
    ANSWERED = "ANSWERED"
    SKIPPED = "SKIPPED"


class ExamModuleQuestion(Base):
    __tablename__ = "exam_module_questions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section: Mapped[SectionEnum] = mapped_column(Enum(SectionEnum), nullable=False, index=True)
    module_number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_order: Mapped[int] = mapped_column(Integer, nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[ExamQuestionStatusEnum] = mapped_column(
        Enum(ExamQuestionStatusEnum), nullable=False, default=ExamQuestionStatusEnum.UNSEEN
    )
    served_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    session = relationship("Session", back_populates="exam_module_questions")
    question = relationship("QuestionBank", backref="exam_module_question_refs")

    __table_args__ = (
        UniqueConstraint("session_id", "section", "module_number", "question_order", name="uq_exam_module_question_order"),
    )
