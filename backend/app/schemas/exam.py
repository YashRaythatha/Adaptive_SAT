"""Exam API schemas."""
from uuid import UUID
from pydantic import BaseModel

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
