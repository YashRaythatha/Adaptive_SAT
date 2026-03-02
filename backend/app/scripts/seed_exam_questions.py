"""
Seed the question bank with enough validated questions to support the first 20 exams
with no repeats. Covers all skills (domains/topics) and difficulties 1-5.
Only stores questions that pass validation (no placeholders).

  python -m app.scripts.seed_exam_questions [--target 40] [--section MATH] [--dry-run]

  Focus on MATH only:  --section MATH
  Focus on RW only:    --section RW

Requires: OPENAI_API_KEY in .env, skills seeded, database migrated.
"""
import argparse
import os
import random
import sys

# Ensure backend root is on path (same as seed_skills)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.skill import Skill, SectionEnum, DomainEnum
from app.services.question_service import count_valid_questions_for_skill_difficulty
from app.services.question_generation import generate_question
from app.core.config import settings

# Questions per exam = 27+27+22+22 = 98. 20 exams = 1960. With 11 skills * 5 difficulties = 55
# combos, we need ~36 per (skill, difficulty). Default 40 gives buffer.
DEFAULT_TARGET_PER_SKILL_DIFFICULTY = 40


def get_skills_ordered_for_coverage(db):
    """Return skills ordered by section, then domain, then name so we cover all domains/topics."""
    skills = (
        db.query(Skill)
        .order_by(Skill.section.asc(), Skill.domain.asc(), Skill.name.asc())
        .all()
    )
    return skills


def run(target: int, dry_run: bool, section_filter: str | None = None) -> None:
    if not settings.openai_api_key:
        print("OPENAI_API_KEY is not set. Set it in backend/.env to generate questions.")
        sys.exit(1)

    db = SessionLocal()
    try:
        skills = get_skills_ordered_for_coverage(db)
        if not skills:
            print("No skills found. Run: python -m app.scripts.seed_skills")
            sys.exit(1)

        if section_filter:
            section_enum = SectionEnum(section_filter)
            skills = [s for s in skills if s.section == section_enum]
            if not skills:
                print(f"No skills found for section {section_filter}.")
                sys.exit(1)
            print(f"Section filter: {section_filter} only ({len(skills)} skills)")

        # Build (skill_id, difficulty) list and optionally shuffle to spread domains
        combos = []
        for skill in skills:
            for difficulty in range(1, 6):
                combos.append((skill, difficulty))
        random.shuffle(combos)

        total_to_generate = 0
        total_generated = 0
        failed = []

        for skill, difficulty in combos:
            count = count_valid_questions_for_skill_difficulty(db, skill.id, difficulty)
            need = max(0, target - count)
            if need == 0:
                continue
            total_to_generate += need
            section_label = skill.section.value if isinstance(skill.section, SectionEnum) else str(skill.section)
            domain_label = skill.domain.value if isinstance(skill.domain, DomainEnum) else str(skill.domain)
            key = f"{section_label} / {skill.name} / diff {difficulty} ({domain_label})"
            if dry_run:
                print(f"  Would generate {need} for: {key} (have {count})")
                continue
            for i in range(need):
                try:
                    generate_question(db, skill.id, difficulty)
                    total_generated += 1
                    if (total_generated % 10) == 0:
                        print(f"  Generated {total_generated} so far...")
                except Exception as e:
                    failed.append((key, str(e)))
                    # continue to next attempt; we may still reach target for other combos

        if dry_run:
            print(f"\nDry run: would generate {total_to_generate} questions across {len(combos)} skill/difficulty combos.")
            return

        print(f"\nGenerated {total_generated} new questions (target was up to {total_to_generate}).")
        if failed:
            print("Some combos failed (first error per combo):")
            for key, err in failed[:20]:
                print(f"  - {key}: {err}")
            if len(failed) > 20:
                print(f"  ... and {len(failed) - 20} more.")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Seed question bank for first 20 exams: all domains/topics, no placeholders."
    )
    parser.add_argument(
        "--target",
        type=int,
        default=DEFAULT_TARGET_PER_SKILL_DIFFICULTY,
        help=f"Target number of valid questions per (skill, difficulty). Default {DEFAULT_TARGET_PER_SKILL_DIFFICULTY}.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print what would be generated; do not call OpenAI or write to DB.",
    )
    parser.add_argument(
        "--section",
        type=str,
        choices=["MATH", "RW"],
        help="Generate only for this section (MATH or RW). Omit to generate for both.",
    )
    args = parser.parse_args()
    if args.target < 1:
        parser.error("--target must be >= 1")
    print(f"Target: {args.target} valid questions per (skill, difficulty). Dry run: {args.dry_run}")
    run(target=args.target, dry_run=args.dry_run, section_filter=args.section)


if __name__ == "__main__":
    main()
