"""User creation and initialization of user_skill_state."""
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.skill import Skill
from app.models.skill import UserSkillState


def create_user(db: Session, name: str, email: str) -> User:
    """Create a user and initialize user_skill_state for every skill with mastery_score=0."""
    user = User(name=name, email=email)
    db.add(user)
    db.flush()  # get user.id

    skills = db.query(Skill).all()
    for skill in skills:
        state = UserSkillState(user_id=user.id, skill_id=skill.id, mastery_score=0)
        db.add(state)

    db.commit()
    db.refresh(user)
    return user


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()
