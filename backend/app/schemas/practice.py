"""Practice API schemas."""
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.models.skill import SectionEnum


class PracticeStartRequest(BaseModel):
    user_id: UUID
    section: SectionEnum
    domain: str | None = None


class TargetedPracticeStartRequest(BaseModel):
    user_id: UUID
    topic: str
    min_questions: int = Field(10, ge=1, le=50)
    max_questions: int = Field(20, ge=1, le=50)


class PracticeStartResponse(BaseModel):
    session_id: UUID
    section: str
    skill_id: UUID


class PracticeNextResponse(BaseModel):
    question_id: UUID
    question_text: str
    choices: dict[str, str]
    difficulty: int


class PracticeAnswerRequest(BaseModel):
    session_id: UUID
    question_id: UUID
    user_answer: str
    time_taken_sec: int | None = None

    @field_validator("user_answer")
    @classmethod
    def user_answer_must_be_choice(cls, v: str) -> str:
        if v is None:
            return v
        normalized = (v or "").strip().upper()
        if normalized not in ("A", "B", "C", "D"):
            raise ValueError("user_answer must be one of A, B, C, D")
        return normalized

    @field_validator("time_taken_sec")
    @classmethod
    def time_taken_non_negative(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("time_taken_sec must be >= 0")
        return v


class PracticeAnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str


class PracticeNextRequest(BaseModel):
    session_id: UUID
    user_id: UUID


class PracticeEndRequest(BaseModel):
    session_id: UUID
