"""
Backfill skill domain where missing or default. Optional; run after seed_skills if needed.
  python -m app.scripts.backfill_skill_domains
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.skill import Skill, DomainEnum


def backfill_skill_domains() -> None:
    db = SessionLocal()
    try:
        skills = db.query(Skill).all()
        updated = 0
        for s in skills:
            # Example: set ADVANCED for "Advanced Math", else CORE
            if "Advanced" in s.name and s.domain == DomainEnum.CORE:
                s.domain = DomainEnum.ADVANCED
                updated += 1
        db.commit()
        print(f"Backfilled domain for {updated} skills.")
    finally:
        db.close()


if __name__ == "__main__":
    backfill_skill_domains()
