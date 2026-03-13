"""
Backfill skill domain to SAT-aligned values. Run after seed_skills or migration 005.
  python -m app.scripts.backfill_skill_domains
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.skill import Skill, SectionEnum, DomainEnum


# (section, skill name) -> SAT-aligned domain
SAT_DOMAIN_BY_SECTION_AND_NAME = {
    (SectionEnum.MATH, "Algebra"): DomainEnum.ALGEBRA,
    (SectionEnum.MATH, "Advanced Math"): DomainEnum.ADVANCED_MATH,
    (SectionEnum.MATH, "Problem Solving and Data Analysis"): DomainEnum.PROBLEM_SOLVING_AND_DATA_ANALYSIS,
    (SectionEnum.MATH, "Geometry and Trigonometry"): DomainEnum.GEOMETRY_AND_TRIGONOMETRY,
    (SectionEnum.RW, "Expression of Ideas"): DomainEnum.EXPRESSION_OF_IDEAS,
    (SectionEnum.RW, "Standard English Conventions"): DomainEnum.STANDARD_ENGLISH_CONVENTIONS,
    (SectionEnum.RW, "Command of Evidence (Textual)"): DomainEnum.INFORMATION_AND_IDEAS,
    (SectionEnum.RW, "Command of Evidence (Quantitative)"): DomainEnum.INFORMATION_AND_IDEAS,
    (SectionEnum.RW, "Words in Context"): DomainEnum.CRAFT_AND_STRUCTURE,
    (SectionEnum.RW, "Analysis in History/Social Studies"): DomainEnum.INFORMATION_AND_IDEAS,
    (SectionEnum.RW, "Analysis in Science"): DomainEnum.INFORMATION_AND_IDEAS,
}


def backfill_skill_domains() -> None:
    db = SessionLocal()
    try:
        skills = db.query(Skill).all()
        updated = 0
        for s in skills:
            key = (s.section, s.name)
            target = SAT_DOMAIN_BY_SECTION_AND_NAME.get(key)
            if target is not None and s.domain != target:
                s.domain = target
                updated += 1
        db.commit()
        print(f"Backfilled domain for {updated} skills.")
    finally:
        db.close()


if __name__ == "__main__":
    backfill_skill_domains()
