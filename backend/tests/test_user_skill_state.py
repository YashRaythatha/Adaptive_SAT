"""Test: creating user initializes all user_skill_state rows at 0."""
import os
import uuid
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL") or "postgresql" not in os.getenv("DATABASE_URL", ""),
    reason="DATABASE_URL with postgresql required",
)


def test_create_user_initializes_user_skill_state():
    from app.db.session import SessionLocal
    from app.models.skill import Skill
    from app.models.skill import UserSkillState
    from app.services.user_service import create_user

    db = SessionLocal()
    try:
        skill_count = db.query(Skill).count()
        if skill_count == 0:
            pytest.skip("Seed skills first")
        user = create_user(db, name="Test User Skill", email=f"test-{uuid.uuid4()}@test.com")
        states = db.query(UserSkillState).filter(UserSkillState.user_id == user.id).all()
        assert len(states) == skill_count
        for s in states:
            assert s.mastery_score == 0
    finally:
        db.close()
