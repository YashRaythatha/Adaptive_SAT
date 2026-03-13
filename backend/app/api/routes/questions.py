"""Question request: cache-first, generate on miss."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.question_api import QuestionRequest, QuestionResponse
from app.services.question_generation import generate_question
from app.services.question_service import get_question, get_or_create_question

router = APIRouter(prefix="/questions", tags=["questions"])


def _to_response(q) -> QuestionResponse:
    return QuestionResponse(
        id=q.id,
        section=q.section,
        skill_id=q.skill_id,
        difficulty_llm=q.difficulty_llm,
        question_text=q.question_text,
        choices=q.choices_json,
        correct_answer=q.correct_answer,
        explanation=q.explanation,
        quality_status=q.quality_status.value,
    )


@router.post("/request", response_model=QuestionResponse)
def request_question(data: QuestionRequest, db: Session = Depends(get_db)) -> QuestionResponse:
    """Get a question for the skill (cache-first); generate on miss. Excludes user's last 100 attempts."""
    def generate(db, skill_id: UUID, difficulty: int):
        return generate_question(db, skill_id, difficulty)

    q = get_or_create_question(
        db,
        generate,
        section=data.section,
        skill_id=data.skill_id,
        difficulty=data.difficulty,
        user_id=data.user_id,
    )
    return _to_response(q)
