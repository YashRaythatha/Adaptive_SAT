"""Analytics endpoints: topic accuracy over time, practice vs exam comparison."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/topic_accuracy")
def topic_accuracy(
    user_id: UUID = Query(...),
    topic: str | None = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Topic-level accuracy over time (per day)."""
    return analytics_service.topic_accuracy_over_time(db, user_id, topic=topic, days=days)


@router.get("/practice_vs_exam")
def practice_vs_exam(
    user_id: UUID = Query(...),
    db: Session = Depends(get_db),
):
    """Practice topic accuracy vs latest exam domain breakdown."""
    out = analytics_service.practice_vs_latest_exam(db, user_id)
    if out is None:
        return {"message": "No exam result or practice data yet"}
    return out
