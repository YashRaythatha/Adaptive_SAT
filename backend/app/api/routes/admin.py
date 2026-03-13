"""Admin endpoints: list questions, get detail, approve/reject, stats. Protected by X-ADMIN-KEY."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import cast, func, String
from sqlalchemy.orm import Session

from app.api.deps import require_admin_key
from app.db.session import get_db
from app.models.attempt import Attempt
from app.models.question_bank import QuestionBank, QualityStatusEnum

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin_key)])


@router.get("/questions")
def list_questions(
    db: Session = Depends(get_db),
    status: QualityStatusEnum | None = Query(None, description="Filter by quality_status"),
    id_prefix: str | None = Query(None, description="Filter by question id prefix (e.g. first 8 chars of UUID)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List questions with optional status filter, id prefix search, and pagination."""
    base = db.query(QuestionBank)
    if status is not None:
        base = base.filter(QuestionBank.quality_status == status)
    if id_prefix:
        base = base.filter(cast(QuestionBank.id, String).like(f"{id_prefix}%"))
    total = base.count()
    items = base.order_by(QuestionBank.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": str(x.id),
                "section": x.section.value,
                "skill_id": str(x.skill_id),
                "difficulty_llm": x.difficulty_llm,
                "question_text": x.question_text[:80] + "..." if len(x.question_text) > 80 else x.question_text,
                "quality_status": x.quality_status.value,
                "created_at": x.created_at.isoformat() if x.created_at else None,
            }
            for x in items
        ],
    }


@router.get("/questions/{question_id}")
def get_question_detail(question_id: UUID, db: Session = Depends(get_db)):
    """Get full question detail."""
    q = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not q:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Question not found")
    return {
        "id": str(q.id),
        "section": q.section.value,
        "skill_id": str(q.skill_id),
        "difficulty_llm": q.difficulty_llm,
        "question_text": q.question_text,
        "choices_json": q.choices_json,
        "correct_answer": q.correct_answer,
        "explanation": q.explanation,
        "quality_status": q.quality_status.value,
        "source_model": q.source_model,
        "prompt_version": q.prompt_version,
        "created_at": q.created_at.isoformat() if q.created_at else None,
    }


@router.post("/questions/{question_id}/approve")
def approve_question(question_id: UUID, db: Session = Depends(get_db)):
    """Set quality_status to APPROVED."""
    q = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not q:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Question not found")
    q.quality_status = QualityStatusEnum.APPROVED
    db.commit()
    return {"id": str(question_id), "quality_status": "APPROVED"}


@router.post("/questions/{question_id}/reject")
def reject_question(question_id: UUID, db: Session = Depends(get_db)):
    """Set quality_status to REJECTED."""
    q = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not q:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Question not found")
    q.quality_status = QualityStatusEnum.REJECTED
    db.commit()
    return {"id": str(question_id), "quality_status": "REJECTED"}


@router.get("/questions/{question_id}/stats")
def question_stats(question_id: UUID, db: Session = Depends(get_db)):
    """Stats: times_used, correct_rate, avg_time_taken_sec."""
    times_used = db.query(func.count(Attempt.id)).filter(Attempt.question_id == question_id).scalar() or 0
    if times_used == 0:
        return {"question_id": str(question_id), "times_used": 0, "correct_rate": None, "avg_time_taken_sec": None}

    correct = db.query(func.count(Attempt.id)).filter(
        Attempt.question_id == question_id, Attempt.is_correct.is_(True)
    ).scalar() or 0
    avg_time = db.query(func.avg(Attempt.time_taken_sec)).filter(
        Attempt.question_id == question_id, Attempt.time_taken_sec.isnot(None)
    ).scalar()
    return {
        "question_id": str(question_id),
        "times_used": times_used,
        "correct_rate": round(correct / times_used, 4) if times_used else None,
        "avg_time_taken_sec": round(float(avg_time), 2) if avg_time is not None else None,
    }
