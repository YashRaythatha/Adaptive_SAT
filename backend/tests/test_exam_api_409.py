"""Test: timer expiry returns 409 MODULE_TIME_EXPIRED from API."""
import os
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL") or "postgresql" not in os.getenv("DATABASE_URL", ""),
    reason="DATABASE_URL with postgresql required",
)


def test_exam_next_returns_409_when_time_expired():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import SessionLocal
    from app.models.session import Session as SessionModel, SessionModeEnum
    from app.models.skill import Skill
    from app.services.user_service import create_user
    from app.services.exam_service import start_exam

    db = SessionLocal()
    try:
        if db.query(Skill).count() == 0:
            pytest.skip("Seed skills first")
        user = create_user(db, name="409 Test", email=f"409-{uuid.uuid4()}@test.com")
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
        client = TestClient(app)
        r = client.post("/api/exam/next", json={"session_id": str(session.id)})
        assert r.status_code == 409
        data = r.json()
        assert data.get("code") == "MODULE_TIME_EXPIRED" or "MODULE_TIME_EXPIRED" in str(data.get("message", ""))
    finally:
        db.close()
