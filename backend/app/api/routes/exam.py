"""Exam endpoints: start, next, answer, advance, result, time_remaining, weak_areas."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import EXAM_MODULE_SPEC
from app.db.session import get_db
from app.models.session import Session as SessionModel
from app.schemas.exam import (
    ExamStartRequest,
    ExamStartResponse,
    ExamNextRequest,
    ExamNextResponse,
    ExamAnswerRequest,
    ExamAnswerResponse,
    ExamAdvanceRequest,
    ExamTimeRemainingResponse,
)
from app.services import exam_service

router = APIRouter(prefix="/exam", tags=["exam"])

MODULE_TOTALS = {("RW", 1): 27, ("RW", 2): 27, ("MATH", 1): 22, ("MATH", 2): 22}


@router.post("/start", response_model=ExamStartResponse)
def exam_start(data: ExamStartRequest, db: Session = Depends(get_db)):
    """Start full Digital SAT exam. RW Module 1 blueprint is built and timer started."""
    try:
        session = exam_service.start_exam(db, data.user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ExamStartResponse(
        session_id=session.id,
        current_section=session.current_section.value if session.current_section else "RW",
        current_module=session.current_module or 1,
        time_limit_sec=session.current_module_time_limit_sec or EXAM_MODULE_SPEC.get(("RW", 1), (27, 32 * 60))[1],
    )


@router.get("/time_remaining", response_model=ExamTimeRemainingResponse)
def exam_time_remaining(
    session_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
):
    """Get seconds remaining for current module. Returns expired=True if time is up."""
    remaining = exam_service.get_module_time_remaining(db, session_id, user_id)
    expired = remaining is not None and remaining == 0
    return ExamTimeRemainingResponse(
        session_id=session_id,
        seconds_remaining=remaining,
        expired=expired,
    )


@router.post("/next", response_model=ExamNextResponse)
def exam_next(data: ExamNextRequest, db: Session = Depends(get_db)):
    """Get next question in current module (from locked blueprint). 409 if module time expired."""
    session = db.query(SessionModel).filter(SessionModel.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    user_id = session.user_id
    if exam_service.is_module_time_expired(db, data.session_id, user_id):
        raise HTTPException(status_code=409, detail="MODULE_TIME_EXPIRED")
    pair = exam_service.get_next_exam_question(db, data.session_id, user_id)
    if not pair:
        raise HTTPException(
            status_code=404,
            detail="No more questions in this module; call advance to continue",
        )
    emq, q = pair
    key = (session.current_section.value if session.current_section else "RW", session.current_module or 1)
    module_total = MODULE_TOTALS.get(key, 27)
    return ExamNextResponse(
        question_id=q.id,
        question_text=q.question_text,
        choices=q.choices_json,
        question_order=emq.question_order + 1,
        module_total=module_total,
        section=session.current_section.value if session.current_section else "RW",
        module_number=session.current_module or 1,
    )


@router.post("/answer", response_model=ExamAnswerResponse)
def exam_answer(data: ExamAnswerRequest, db: Session = Depends(get_db)):
    """Submit answer. 409 if module time expired."""
    session = db.query(SessionModel).filter(SessionModel.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if exam_service.is_module_time_expired(db, data.session_id, session.user_id):
        raise HTTPException(status_code=409, detail="MODULE_TIME_EXPIRED")
    try:
        result = exam_service.submit_exam_answer(
            db,
            session_id=data.session_id,
            user_id=session.user_id,
            question_id=data.question_id,
            user_answer=data.user_answer,
            time_taken_sec=data.time_taken_sec,
        )
    except ValueError as e:
        if "MODULE_TIME_EXPIRED" in str(e):
            raise HTTPException(status_code=409, detail="MODULE_TIME_EXPIRED")
        raise HTTPException(status_code=400, detail=str(e))
    return ExamAnswerResponse(**result)


@router.post("/advance")
def exam_advance(data: ExamAdvanceRequest, db: Session = Depends(get_db)):
    """Advance to next module (or end exam after Math M2). Builds next module blueprint when entering a new module."""
    session = db.query(SessionModel).filter(SessionModel.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        out = exam_service.advance_exam(db, data.session_id, session.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return out


@router.get("/result")
def exam_result(
    session_id: UUID = Query(...),
    user_id: UUID = Query(...),
    db: Session = Depends(get_db),
):
    """Get exam result for a completed session."""
    result = exam_service.get_exam_result(db, session_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result


@router.get("/review")
def exam_review(
    session_id: UUID = Query(...),
    user_id: UUID = Query(...),
    db: Session = Depends(get_db),
):
    """Get detailed analysis and full review of all 98 questions (correct answer, your answer, explanation) for a completed exam."""
    review = exam_service.get_exam_review(db, session_id, user_id)
    if not review:
        raise HTTPException(status_code=404, detail="Exam review not found. Complete an exam first.")
    return review


@router.get("/history")
def exam_history(
    user_id: UUID = Query(...),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List past completed exams for the user (session_id, date, scores). Newest first."""
    return exam_service.get_exam_history(db, user_id, limit=limit)


@router.get("/weak_areas")
def exam_weak_areas(
    user_id: UUID = Query(...),
    top_n: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Get weakest areas from latest exam for recommended practice."""
    return exam_service.get_weak_areas(db, user_id, top_n=top_n)
