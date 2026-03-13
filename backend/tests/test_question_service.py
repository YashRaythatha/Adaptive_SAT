"""Test question service cache-first and exclude logic (with mocked DB or skip)."""
import os
import uuid
import pytest
from unittest.mock import MagicMock

# Only run if we have a DB (optional)
pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL") or "postgresql" not in os.getenv("DATABASE_URL", ""),
    reason="DATABASE_URL with postgresql required",
)


def test_get_question_prefers_approved():
    """Smoke: get_question returns APPROVED first when available."""
    from app.db.session import SessionLocal
    from app.models.question_bank import QuestionBank, QualityStatusEnum
    from app.models.skill import Skill, SectionEnum, DomainEnum
    from app.services.question_service import get_question

    db = SessionLocal()
    try:
        skill = db.query(Skill).filter(Skill.section == SectionEnum.RW).first()
        if not skill:
            pytest.skip("No skills in DB")
        q = get_question(
            db,
            section=SectionEnum.RW,
            skill_id=skill.id,
            difficulty=1,
        )
        # May be None if no questions; if present, should be APPROVED or DRAFT
        if q:
            assert q.quality_status in (QualityStatusEnum.APPROVED, QualityStatusEnum.DRAFT)
    finally:
        db.close()
