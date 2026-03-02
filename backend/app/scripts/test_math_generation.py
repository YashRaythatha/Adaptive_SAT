"""
Generate one MATH question and print the result or error.
Use this to verify that Math questions are generating properly (prompt, JSON parsing, validation).

  python -m app.scripts.test_math_generation [--skill "Algebra"] [--difficulty 3]

Requires OPENAI_API_KEY in backend/.env. Uses the first MATH skill matching --skill (default: any MATH skill).
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.skill import Skill, SectionEnum
from app.services.question_generation import generate_question


def run(skill_name_filter: str | None, difficulty: int) -> None:
    db = SessionLocal()
    try:
        q = db.query(Skill).filter(Skill.section == SectionEnum.MATH)
        if skill_name_filter:
            q = q.filter(Skill.name.ilike(f"%{skill_name_filter}%"))
        skill = q.first()
        if not skill:
            print("No MATH skill found" + (f" matching '{skill_name_filter}'." if skill_name_filter else "."))
            print("Run seed_skills.py first.")
            return

        print("Generating one MATH question...")
        print(f"Skill: {skill.name}  |  Difficulty: {difficulty}")
        print("-" * 60)

        try:
            question = generate_question(db, skill.id, difficulty)
        except Exception as e:
            print("FAILED:", type(e).__name__, str(e))
            raise

        print("SUCCESS – question saved to question_bank.")
        print()
        print("Question:", (question.question_text or "")[:200] + ("..." if len(question.question_text or "") > 200 else ""))
        choices = question.choices_json or {}
        for k in ("A", "B", "C", "D"):
            v = (choices.get(k) or "").strip()
            print(f"  {k}:", v[:80] + ("..." if len(v) > 80 else ""))
        print("Correct:", (question.correct_answer or "").strip())
        expl = (question.explanation or "").strip()
        print("Explanation:", expl[:150] + ("..." if len(expl) > 150 else ""))
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Generate one MATH question to verify generation pipeline.")
    parser.add_argument("--skill", type=str, help="MATH skill name to use (e.g. Algebra). Default: first MATH skill.")
    parser.add_argument("--difficulty", type=int, default=3, choices=[1, 2, 3, 4, 5], help="Difficulty 1-5 (default 3)")
    args = parser.parse_args()
    run(skill_name_filter=args.skill, difficulty=args.difficulty)


if __name__ == "__main__":
    main()
