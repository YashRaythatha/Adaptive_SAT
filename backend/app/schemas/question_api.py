"""Question API request/response schemas."""
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.models.skill import SectionEnum


class QuestionRequest(BaseModel):
    """Request a question for a skill; cache-first, generate on miss."""
    user_id: UUID
    skill_id: UUID
    section: SectionEnum
    difficulty: int = Field(ge=1, le=5, description="Difficulty 1-5")


class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    section: SectionEnum
    skill_id: UUID
    difficulty_llm: int
    question_text: str
    choices: dict[str, str]  # A-D
    correct_answer: str
    explanation: str | None
    quality_status: str


class QuestionDetailResponse(QuestionResponse):
    model_config = ConfigDict(from_attributes=True)
    source_model: str | None
    prompt_version: str | None
    created_at: str | None
