"""Exam API schemas."""
from uuid import UUID
from pydantic import BaseModel, field_validator

from app.models.skill import SectionEnum


class ExamStartRequest(BaseModel):
    user_id: UUID


class ExamStartResponse(BaseModel):
    session_id: UUID
    current_section: str
    current_module: int
    time_limit_sec: int


class ExamNextResponse(BaseModel):
    question_id: UUID
    question_text: str
    choices: dict[str, str]
    question_order: int
    module_total: int
    section: str
    module_number: int


class ExamAnswerRequest(BaseModel):
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


class ExamAnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str


class ExamNextRequest(BaseModel):
    session_id: UUID


class ExamAdvanceRequest(BaseModel):
    session_id: UUID


class ExamTimeRemainingResponse(BaseModel):
    session_id: UUID
    seconds_remaining: int | None
    expired: bool
