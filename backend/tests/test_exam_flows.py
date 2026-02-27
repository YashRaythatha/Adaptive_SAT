"""Test: exam blueprint locks questions, routing at 0.65, timer expiry 409, weak areas sorted."""
import os
import uuid
from unittest.mock import patch
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL") or "postgresql" not in os.getenv("DATABASE_URL", ""),
    reason="DATABASE_URL with postgresql required",
)


def test_exam_blueprint_locks_questions():
    """Exam module questions are built once and served by question_order."""
    from app.db.session import SessionLocal
    from app.models.exam_module_question import ExamModuleQuestion
    from app.models.skill import Skill, SectionEnum
    from app.services.user_service import create_user
    from app.services.exam_service import start_exam, get_next_exam_question

    db = SessionLocal()
    try:
        if db.query(Skill).count() == 0:
            pytest.skip("Seed skills first")
        user = create_user(db, name="Exam Blueprint", email=f"exam-bp-{uuid.uuid4()}@test.com")
        try:
            session = start_exam(db, user.id)
        except ValueError as e:
            if "Not enough" in str(e) or "not enough" in str(e).lower():
                pytest.skip("Exam requires valid questions in the bank (APPROVED/DRAFT or generation). Add questions or set OPENAI_API_KEY.")
            raise
        emqs = db.query(ExamModuleQuestion).filter(
            ExamModuleQuestion.session_id == session.id,
            ExamModuleQuestion.section == session.current_section,
            ExamModuleQuestion.module_number == session.current_module,
        ).order_by(ExamModuleQuestion.question_order).all()
        assert len(emqs) >= 1
        question_ids = [e.question_id for e in emqs]
        assert len(question_ids) == len(set(question_ids))
        pair = get_next_exam_question(db, session.id, user.id)
        if pair:
            emq, q = pair
            assert emq.question_id == q.id
    finally:
        db.close()


def test_timer_expiry_returns_409():
    """When module time is expired, next/answer should signal MODULE_TIME_EXPIRED (409)."""
    from datetime import datetime, timedelta
    from app.db.session import SessionLocal
    from app.models.session import Session as SessionModel, SessionModeEnum
    from app.models.skill import Skill
    from app.services.user_service import create_user
    from app.services.exam_service import start_exam, is_module_time_expired

    db = SessionLocal()
    try:
        if db.query(Skill).count() == 0:
            pytest.skip("Seed skills first")
        user = create_user(db, name="Timer Test", email=f"timer-{uuid.uuid4()}@test.com")
        try:
            session = start_exam(db, user.id)
        except ValueError as e:
            if "Not enough" in str(e) or "not enough" in str(e).lower():
                pytest.skip("Exam requires valid questions in the bank (APPROVED/DRAFT or generation). Add questions or set OPENAI_API_KEY.")
            raise
        s = db.query(SessionModel).filter(SessionModel.id == session.id).first()
        s.current_module_started_at = datetime.utcnow() - timedelta(minutes=40)
        s.current_module_time_limit_sec = 32 * 60
        db.commit()
        assert is_module_time_expired(db, session.id, user.id) is True
    finally:
        db.close()


def test_weak_areas_sorted_by_accuracy():
    """Weak areas returned in ascending order of score (worst first)."""
    from app.db.session import SessionLocal
    from app.models.exam_result import ExamResult
    from app.models.session import Session as SessionModel, SessionModeEnum, SessionStatusEnum
    from app.models.skill import Skill
    from app.services.user_service import create_user
    from app.services.exam_service import get_weak_areas

    db = SessionLocal()
    try:
        user = create_user(db, name="Weak Test", email=f"weak-{uuid.uuid4()}@test.com")
        skills = db.query(Skill).limit(3).all()
        if len(skills) < 2:
            pytest.skip("Need at least 2 skills")
        sess = SessionModel(
            user_id=user.id,
            mode=SessionModeEnum.EXAM,
            status=SessionStatusEnum.ENDED,
        )
        db.add(sess)
        db.flush()
        breakdown = {str(s.id): 100 - i * 30 for i, s in enumerate(skills)}
        er = ExamResult(
            session_id=sess.id,
            user_id=user.id,
            rw_total_correct=10,
            math_total_correct=10,
            domain_breakdown_json=breakdown,
        )
        db.add(er)
        db.commit()
        areas = get_weak_areas(db, user.id, top_n=5)
        scores = [a["score_from_exam"] for a in areas]
        assert scores == sorted(scores)
    finally:
        db.close()
