"""
Preview sample questions from the bank to verify quality (no placeholders, min lengths).
  python -m app.scripts.preview_questions [--count 8]
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.question_bank import QuestionBank, QualityStatusEnum
from app.models.skill import Skill, SectionEnum
from app.services.question_service import is_placeholder_or_low_quality

TRUNCATE = 120
TRUNCATE_EXPL = 80


def trunc(s: str, n: int) -> str:
    if not s:
        return ""
    s = s.strip()
    return s[:n] + "..." if len(s) > n else s


def run(count: int, section_filter: str | None = None) -> None:
    db = SessionLocal()
    try:
        query = (
            db.query(QuestionBank)
            .join(Skill, QuestionBank.skill_id == Skill.id)
            .filter(
                QuestionBank.quality_status.in_(
                    [QualityStatusEnum.APPROVED, QualityStatusEnum.DRAFT]
                )
            )
        )
        if section_filter:
            query = query.filter(QuestionBank.section == SectionEnum(section_filter))
        questions = (
            query.order_by(QuestionBank.section, Skill.name, QuestionBank.difficulty_llm)
            .limit(count * 3)
            .all()
        )
        # Dedupe by (section, skill_id, difficulty) and take up to `count`
        seen = set()
        sample = []
        for q in questions:
            key = (q.section.value, str(q.skill_id), q.difficulty_llm)
            if key not in seen and len(sample) < count:
                seen.add(key)
                sample.append(q)
        if not sample:
            print("No questions in the bank (APPROVED or DRAFT). Run seed_exam_questions or add questions first.")
            return

        print("=" * 72)
        title = "QUESTION PREVIEW – check for placeholders, length, and SAT-style content"
        if section_filter:
            title += f" [section={section_filter}]"
        print(title)
        print("=" * 72)

        valid_count = 0
        invalid_count = 0
        by_section = {"RW": 0, "MATH": 0}

        for i, q in enumerate(sample, 1):
            skill = db.query(Skill).filter(Skill.id == q.skill_id).first()
            skill_name = skill.name if skill else str(q.skill_id)
            ok = not is_placeholder_or_low_quality(q)
            if ok:
                valid_count += 1
            else:
                invalid_count += 1
            by_section[q.section.value] = by_section.get(q.section.value, 0) + 1

            status_icon = "OK" if ok else "FAIL"
            print(f"\n--- Question {i} [{status_icon}] ---")
            print(f"Section: {q.section.value}  |  Skill: {skill_name}  |  Difficulty: {q.difficulty_llm}  |  Status: {q.quality_status.value}")
            print(f"Question: {trunc(q.question_text or '', TRUNCATE)}")
            choices = q.choices_json or {}
            for k in ("A", "B", "C", "D"):
                v = (choices.get(k) or "").strip()
                print(f"  {k}: {trunc(v, TRUNCATE)}")
            print(f"Correct: {(q.correct_answer or '').strip()}")
            print(f"Explanation: {trunc(q.explanation or '', TRUNCATE_EXPL)}")
            if not ok:
                print("  ^ Fails quality check (placeholder, too short, or invalid)")

        print("\n" + "=" * 72)
        print("SUMMARY")
        print("=" * 72)
        print(f"Previewed: {len(sample)} questions")
        print(f"Valid (exam-ready): {valid_count}")
        print(f"Invalid: {invalid_count}")
        print(f"By section: RW={by_section.get('RW', 0)}, MATH={by_section.get('MATH', 0)}")
        if invalid_count > 0:
            print("\nFix: Edit or reject invalid questions in Admin; generate more with seed_exam_questions.")
        else:
            print("\nAll previewed questions pass quality check.")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Preview sample questions from the bank.")
    parser.add_argument("--count", type=int, default=8, help="Max questions to preview (default 8)")
    parser.add_argument("--section", type=str, choices=["MATH", "RW"], help="Show only MATH or RW questions")
    args = parser.parse_args()
    run(count=min(max(1, args.count), 50), section_filter=args.section)


if __name__ == "__main__":
    main()
