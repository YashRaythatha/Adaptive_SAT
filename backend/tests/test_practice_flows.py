"""Test: practice start (allowed without baseline), practice answer returns explanation."""
import os
import uuid
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL") or "postgresql" not in os.getenv("DATABASE_URL", ""),
    reason="DATABASE_URL with postgresql required",
)


def test_practice_start_succeeds_without_baseline():
    """Practice is not blocked before baseline (per product requirement)."""
    from app.db.session import SessionLocal
    from app.models.skill import Skill, SectionEnum
    from app.services.user_service import create_user
    from app.services.practice_service import start_practice

    db = SessionLocal()
    try:
        if db.query(Skill).filter(Skill.section == SectionEnum.RW).count() == 0:
            pytest.skip("Seed skills first")
        user = create_user(db, name="Practice Test", email=f"practice-{uuid.uuid4()}@test.com")
        assert user.has_taken_baseline_exam is False
        session = start_practice(db, user_id=user.id, section=SectionEnum.RW)
        assert session.id is not None
        assert session.mode.value == "PRACTICE"
    finally:
        db.close()


def test_practice_answer_returns_explanation():
    """Submit answer returns is_correct, correct_answer, explanation."""
    from app.db.session import SessionLocal
    from app.models.question_bank import QuestionBank, QualityStatusEnum
    from app.models.skill import Skill, SectionEnum
    from app.models.user_skill_state import UserSkillState
    from app.services.user_service import create_user
    from app.services.practice_service import start_practice, submit_answer

    db = SessionLocal()
    try:
        if db.query(Skill).filter(Skill.section == SectionEnum.RW).count() == 0:
            pytest.skip("Seed skills first")
        user = create_user(db, name="Answer Test", email=f"answer-{uuid.uuid4()}@test.com")
        session = start_practice(db, user_id=user.id, section=SectionEnum.RW)
        skill_id = session.current_practice_skill_id
        q = db.query(QuestionBank).filter(
            QuestionBank.skill_id == skill_id,
            QuestionBank.quality_status.in_([QualityStatusEnum.APPROVED, QualityStatusEnum.DRAFT]),
        ).first()
        if not q:
            pytest.skip("No question for skill")
        result = submit_answer(
            db, session_id=session.id, user_id=user.id,
            question_id=q.id, user_answer=q.correct_answer, time_taken_sec=10,
        )
        assert "is_correct" in result
        assert "correct_answer" in result
        assert "explanation" in result
        assert len(result["explanation"]) >= 1
    finally:
        db.close()
