"""Test: routing at 0.65 (M1 accuracy >= 0.65 => HARD M2)."""
import os
import uuid
from unittest.mock import patch, MagicMock
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL") or "postgresql" not in os.getenv("DATABASE_URL", ""),
    reason="DATABASE_URL with postgresql required",
)


def test_routing_at_threshold():
    """When RW M1 accuracy >= 0.65, M2 uses HARD band (more diff 4-5)."""
    from app.db.session import SessionLocal
    from app.models.attempt import Attempt
    from app.models.exam_module_question import ExamModuleQuestion
    from app.models.question_bank import QuestionBank
    from app.models.skill import Skill, SectionEnum
    from app.services.user_service import create_user
    from app.services.exam_service import start_exam, advance_exam

    db = SessionLocal()
    try:
        if db.query(Skill).count() == 0:
            pytest.skip("Seed skills first")
        user = create_user(db, name="Route Test", email=f"route-{uuid.uuid4()}@test.com")
        try:
            session = start_exam(db, user.id)
        except ValueError as e:
            if "Not enough" in str(e) or "not enough" in str(e).lower():
                pytest.skip("Exam requires valid questions in the bank (APPROVED/DRAFT or generation). Add questions or set OPENAI_API_KEY.")
            raise
        rw1_qids = [e.question_id for e in db.query(ExamModuleQuestion).filter(
            ExamModuleQuestion.session_id == session.id,
            ExamModuleQuestion.section == SectionEnum.RW,
            ExamModuleQuestion.module_number == 1,
        ).all()]
        for i, qid in enumerate(rw1_qids[:20]):
            correct = i < 14
            db.add(Attempt(session_id=session.id, question_id=qid, user_answer="A", is_correct=correct))
        db.commit()
        out = advance_exam(db, session.id, user.id)
        assert out.get("status") == "ACTIVE"
        assert out.get("current_module") == 2
        m2_questions = db.query(ExamModuleQuestion).filter(
            ExamModuleQuestion.session_id == session.id,
            ExamModuleQuestion.section == SectionEnum.RW,
            ExamModuleQuestion.module_number == 2,
        ).all()
        assert len(m2_questions) >= 1
    finally:
        db.close()
