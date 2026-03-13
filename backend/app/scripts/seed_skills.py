"""
Seed skills table. Run after migrations.
  python -m app.scripts.seed_skills
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.skill import Skill, SectionEnum, DomainEnum


def seed_skills() -> None:
    db = SessionLocal()
    try:
        existing = db.query(Skill).count()
        if existing > 0:
            print(f"Skills already seeded ({existing} rows). Skipping.")
            return

        # SAT-aligned domains (Digital SAT content domains)
        skills_data = [
            # Reading and Writing
            (SectionEnum.RW, "Command of Evidence (Textual)", "Use evidence from a text to support or revise claims", DomainEnum.INFORMATION_AND_IDEAS),
            (SectionEnum.RW, "Command of Evidence (Quantitative)", "Use evidence from data/graphs to support or revise claims", DomainEnum.INFORMATION_AND_IDEAS),
            (SectionEnum.RW, "Words in Context", "Determine word meaning in context", DomainEnum.CRAFT_AND_STRUCTURE),
            (SectionEnum.RW, "Analysis in History/Social Studies", "Analyze purpose, evidence, and reasoning in social studies texts", DomainEnum.INFORMATION_AND_IDEAS),
            (SectionEnum.RW, "Analysis in Science", "Analyze purpose, evidence, and reasoning in science texts", DomainEnum.INFORMATION_AND_IDEAS),
            (SectionEnum.RW, "Expression of Ideas", "Rhetorical and editing: concision, style, structure", DomainEnum.EXPRESSION_OF_IDEAS),
            (SectionEnum.RW, "Standard English Conventions", "Grammar, punctuation, sentence structure", DomainEnum.STANDARD_ENGLISH_CONVENTIONS),
            # Math
            (SectionEnum.MATH, "Algebra", "Linear equations, inequalities, systems", DomainEnum.ALGEBRA),
            (SectionEnum.MATH, "Advanced Math", "Quadratics, exponentials, radicals", DomainEnum.ADVANCED_MATH),
            (SectionEnum.MATH, "Problem Solving and Data Analysis", "Rates, ratios, percentages, data interpretation", DomainEnum.PROBLEM_SOLVING_AND_DATA_ANALYSIS),
            (SectionEnum.MATH, "Geometry and Trigonometry", "Area, volume, angles, basic trig", DomainEnum.GEOMETRY_AND_TRIGONOMETRY),
        ]

        for section, name, description, domain in skills_data:
            s = Skill(section=section, name=name, description=description, domain=domain)
            db.add(s)

        db.commit()
        print(f"Seeded {len(skills_data)} skills.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_skills()
