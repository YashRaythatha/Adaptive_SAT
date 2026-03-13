"""Analytics: topic accuracy over time, practice vs latest exam comparison."""
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.exam_result import ExamResult
from app.models.practice_topic_summary import PracticeTopicSummary


def topic_accuracy_over_time(
    db: Session,
    user_id: UUID,
    topic: str | None = None,
    days: int = 30,
) -> list[dict]:
    """Return topic-level accuracy per day. If topic is None, aggregate all topics."""
    since = date.today() - timedelta(days=days)
    q = (
        db.query(
            PracticeTopicSummary.summary_date,
            PracticeTopicSummary.topic,
            func.sum(PracticeTopicSummary.questions_answered).label("total"),
            func.sum(PracticeTopicSummary.correct_count).label("correct"),
        )
        .filter(
            PracticeTopicSummary.user_id == user_id,
            PracticeTopicSummary.summary_date >= since,
        )
    )
    if topic:
        q = q.filter(PracticeTopicSummary.topic == topic)
    q = q.group_by(PracticeTopicSummary.summary_date, PracticeTopicSummary.topic)
    rows = q.all()
    return [
        {
            "date": r.summary_date.isoformat() if r.summary_date else None,
            "topic": r.topic,
            "questions_answered": r.total or 0,
            "correct_count": r.correct or 0,
            "accuracy": round((r.correct or 0) / (r.total or 1), 4),
        }
        for r in rows
    ]


def practice_vs_latest_exam(db: Session, user_id: UUID) -> dict | None:
    """Compare practice topic accuracy vs latest exam domain breakdown (by skill/topic)."""
    result = db.query(ExamResult).filter(ExamResult.user_id == user_id).order_by(ExamResult.created_at.desc()).first()
    if not result or not result.domain_breakdown_json:
        return None
    exam_breakdown = result.domain_breakdown_json
    # Get latest practice topic summaries (e.g. last 7 days)
    since = date.today() - timedelta(days=7)
    summaries = (
        db.query(
            PracticeTopicSummary.topic,
            func.sum(PracticeTopicSummary.questions_answered).label("total"),
            func.sum(PracticeTopicSummary.correct_count).label("correct"),
        )
        .filter(
            PracticeTopicSummary.user_id == user_id,
            PracticeTopicSummary.summary_date >= since,
        )
        .group_by(PracticeTopicSummary.topic)
        .all()
    )
    practice_by_topic = {
        r.topic: {"questions_answered": r.total or 0, "correct_count": r.correct or 0, "accuracy": round((r.correct or 0) / (r.total or 1), 4)}
        for r in summaries
    }
    return {
        "exam_result": {
            "session_id": str(result.session_id),
            "rw_scaled": result.rw_scaled,
            "math_scaled": result.math_scaled,
            "total_scaled": result.total_scaled,
            "domain_breakdown": exam_breakdown,
        },
        "practice_by_topic": practice_by_topic,
    }
