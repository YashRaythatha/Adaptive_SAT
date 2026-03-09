"""Practice endpoints: start, next, answer, end. No baseline gate."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.session import Session as SessionModel
from app.schemas.practice import (
    PracticeStartRequest,
    PracticeStartResponse,
    TargetedPracticeStartRequest,
    PracticeNextRequest,
    PracticeNextResponse,
    PracticeAnswerRequest,
    PracticeAnswerResponse,
    PracticeEndRequest,
)
from app.services import practice_service

router = APIRouter(prefix="/practice", tags=["practice"])


@router.post("/start", response_model=PracticeStartResponse)
def practice_start(data: PracticeStartRequest, db: Session = Depends(get_db)):
    """Start a practice session. Not gated on baseline exam. Picks lowest mastery skill in section."""
    try:
        session = practice_service.start_practice(
            db, user_id=data.user_id, section=data.section, domain=data.domain
        )
    except ValueError as e:
        if str(e) == "USER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        raise HTTPException(status_code=400, detail=str(e))
    return PracticeStartResponse(
        session_id=session.id,
        section=session.current_section.value if session.current_section else "",
        skill_id=session.current_practice_skill_id,
    )


@router.post("/targeted/start", response_model=PracticeStartResponse)
def targeted_practice_start(data: TargetedPracticeStartRequest, db: Session = Depends(get_db)):
    """Start targeted practice by topic. Preselects 10-20 questions (cap), no repeats in session."""
    try:
        session = practice_service.start_targeted_practice(
            db,
            user_id=data.user_id,
            topic=data.topic,
            min_questions=data.min_questions,
            max_questions=data.max_questions,
        )
    except ValueError as e:
        if str(e) == "USER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        raise HTTPException(status_code=400, detail=str(e))
    return PracticeStartResponse(
        session_id=session.id,
        section=session.current_section.value if session.current_section else "",
        skill_id=session.current_practice_skill_id,
    )


@router.post("/next", response_model=PracticeNextResponse)
def practice_next(data: PracticeNextRequest, db: Session = Depends(get_db)):
    """Get next question for the practice session."""
    q = practice_service.get_next_question(
        db, session_id=data.session_id, user_id=data.user_id
    )
    if not q:
        raise HTTPException(status_code=404, detail="No question available or session invalid")
    return PracticeNextResponse(
        question_id=q.id,
        question_text=q.question_text,
        choices=q.choices_json,
        difficulty=q.difficulty_llm,
    )


@router.post("/answer", response_model=PracticeAnswerResponse)
def practice_answer(data: PracticeAnswerRequest, db: Session = Depends(get_db)):
    """Submit answer. Returns is_correct, correct_answer, explanation. Updates mastery and last_seen_at."""
    session = db.query(SessionModel).filter(SessionModel.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        result = practice_service.submit_answer(
            db,
            session_id=data.session_id,
            user_id=session.user_id,
            question_id=data.question_id,
            user_answer=data.user_answer,
            time_taken_sec=data.time_taken_sec,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return PracticeAnswerResponse(**result)


@router.post("/end")
def practice_end(data: PracticeEndRequest, db: Session = Depends(get_db)):
    """End the practice session."""
    session = db.query(SessionModel).filter(SessionModel.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        practice_service.end_practice(db, session_id=data.session_id, user_id=session.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"session_id": str(data.session_id), "status": "ENDED"}
