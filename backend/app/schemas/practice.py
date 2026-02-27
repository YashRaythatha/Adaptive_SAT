"""Practice API schemas."""
from uuid import UUID
from pydantic import BaseModel

from app.models.skill import SectionEnum


class PracticeStartRequest(BaseModel):
    user_id: UUID
    section: SectionEnum
    domain: str | None = None


class TargetedPracticeStartRequest(BaseModel):
    user_id: UUID
    topic: str
    min_questions: int = 10
    max_questions: int = 20


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


class PracticeAnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str


class PracticeNextRequest(BaseModel):
    session_id: UUID
    user_id: UUID


class PracticeEndRequest(BaseModel):
    session_id: UUID
