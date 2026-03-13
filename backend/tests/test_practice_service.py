"""Test practice service (start, next, answer) - requires DB and seeded skills."""
import os
import uuid
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL") or "postgresql" not in os.getenv("DATABASE_URL", ""),
    reason="DATABASE_URL with postgresql required",
)


def test_start_practice_requires_skills_and_user():
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.models.skill import Skill, SectionEnum
    from app.services.user_service import create_user
    from app.services.practice_service import start_practice

    db = SessionLocal()
    try:
        skill_count = db.query(Skill).filter(Skill.section == SectionEnum.RW).count()
        if skill_count == 0:
            pytest.skip("Seed skills first")
        user = create_user(db, name="Test Practice User", email=f"practice-{uuid.uuid4()}@test.com")
        session = start_practice(db, user_id=user.id, section=SectionEnum.RW)
        assert session.id is not None
        assert session.current_practice_skill_id is not None
        assert session.current_practice_difficulty == 1
    finally:
        db.close()
