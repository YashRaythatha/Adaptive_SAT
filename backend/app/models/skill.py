"""Skill and user_skill_state models."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

import enum
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class SectionEnum(str, enum.Enum):
    MATH = "MATH"
    RW = "RW"


class DomainEnum(str, enum.Enum):
    """Domain for skills. SAT-aligned names (4 per section); legacy CORE/ADVANCED/OTHER kept for backfill."""
    # Legacy (used only until migration/backfill)
    CORE = "CORE"
    ADVANCED = "ADVANCED"
    OTHER = "OTHER"
    # SAT Math (Digital SAT)
    ALGEBRA = "Algebra"
    ADVANCED_MATH = "Advanced Math"
    PROBLEM_SOLVING_AND_DATA_ANALYSIS = "Problem Solving and Data Analysis"
    GEOMETRY_AND_TRIGONOMETRY = "Geometry and Trigonometry"
    # SAT Reading and Writing
    CRAFT_AND_STRUCTURE = "Craft and Structure"
    INFORMATION_AND_IDEAS = "Information and Ideas"
    STANDARD_ENGLISH_CONVENTIONS = "Standard English Conventions"
    EXPRESSION_OF_IDEAS = "Expression of Ideas"


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    section: Mapped[SectionEnum] = mapped_column(Enum(SectionEnum), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    domain: Mapped[DomainEnum] = mapped_column(Enum(DomainEnum), nullable=False, default=DomainEnum.CORE, index=True)
    topic: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user_skill_states = relationship("UserSkillState", back_populates="skill", cascade="all, delete-orphan")
    questions = relationship("QuestionBank", back_populates="skill", cascade="all, delete-orphan")


class UserSkillState(Base):
    __tablename__ = "user_skill_state"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )
    mastery_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="user_skill_states")
    skill = relationship("Skill", back_populates="user_skill_states")
