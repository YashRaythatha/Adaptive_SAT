"""Progress: skills and mastery for a user."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.skill import Skill
from app.models.skill import UserSkillState

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/skills")
def get_skills_progress(
    user_id: UUID = Query(...),
    db: Session = Depends(get_db),
):
    """Return list of { skill_id, skill_name, section, mastery_score } for the user."""
    rows = (
        db.query(Skill.id, Skill.name, Skill.section, UserSkillState.mastery_score)
        .join(UserSkillState, UserSkillState.skill_id == Skill.id)
        .filter(UserSkillState.user_id == user_id)
        .all()
    )
    return [
        {
            "skill_id": str(r.id),
            "skill_name": r.name,
            "section": r.section.value,
            "mastery_score": r.mastery_score,
        }
        for r in rows
    ]
