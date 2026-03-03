"""
Report total questions and counts by skill and difficulty.

  python -m app.scripts.question_counts_by_skill_difficulty

Run from repo root or with PYTHONPATH=backend.
"""
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.question_bank import QuestionBank, QualityStatusEnum
from app.models.skill import Skill, SectionEnum


def main() -> None:
    db = SessionLocal()
    try:
        rows = (
            db.query(QuestionBank.skill_id, QuestionBank.difficulty_llm, QuestionBank.quality_status)
            .all()
        )
        skills = {s.id: (s.name, s.section) for s in db.query(Skill).all()}

        # (skill_id, difficulty) -> count; optionally by status
        by_skill_diff: dict[tuple, int] = defaultdict(int)
        for skill_id, diff, status in rows:
            by_skill_diff[(skill_id, diff)] += 1

        total = len(rows)
        by_section: dict[str, int] = defaultdict(int)
        by_section_diff: dict[tuple, int] = defaultdict(int)

        for (skill_id, diff), count in by_skill_diff.items():
            name, section = skills.get(skill_id, ("?", None))
            sec_val = section.value if section else "?"
            by_section[sec_val] += count
            by_section_diff[(sec_val, diff)] += count

        print("=" * 70)
        print("QUESTION BANK: Total count and breakdown by skill & difficulty")
        print("=" * 70)
        print(f"\nTotal questions: {total}\n")

        print("By section:")
        for sec in [SectionEnum.RW.value, SectionEnum.MATH.value]:
            c = by_section.get(sec, 0)
            print(f"  {sec}: {c}")
        print()

        print("By section and difficulty (1–5):")
        print(f"  {'Section':<8} {'D1':>6} {'D2':>6} {'D3':>6} {'D4':>6} {'D5':>6}  Total")
        print("  " + "-" * 50)
        for sec in [SectionEnum.RW.value, SectionEnum.MATH.value]:
            row_total = 0
            cells = [sec]
            for d in range(1, 6):
                c = by_section_diff.get((sec, d), 0)
                row_total += c
                cells.append(str(c))
            cells.append(str(row_total))
            print(f"  {cells[0]:<8} {cells[1]:>6} {cells[2]:>6} {cells[3]:>6} {cells[4]:>6} {cells[5]:>6}  {cells[6]:>6}")
        print()

        # Per-skill breakdown (sort by section then skill name)
        skill_ids_seen = {sid for (sid, _) in by_skill_diff}

        def sort_key(sid):
            name, section = skills.get(sid, ("?", None))
            return (section.value if section else "", name or "")

        skill_list = [(sid, skills.get(sid, ("?", None))) for sid in sorted(skill_ids_seen, key=sort_key)]

        print("By skill and difficulty:")
        print(f"  {'Section':<8} {'Skill':<45} {'D1':>5} {'D2':>5} {'D3':>5} {'D4':>5} {'D5':>5}  Total")
        print("  " + "-" * 88)
        for skill_id, (name, section) in skill_list:
            sec_val = section.value if section else "?"
            skill_total = 0
            cells = [sec_val, (name or "?")[:44]]
            for d in range(1, 6):
                c = by_skill_diff.get((skill_id, d), 0)
                skill_total += c
                cells.append(str(c))
            cells.append(str(skill_total))
            print(f"  {cells[0]:<8} {cells[1]:<45} {cells[2]:>5} {cells[3]:>5} {cells[4]:>5} {cells[5]:>5} {cells[6]:>5}  {cells[7]:>5}")
        print("  " + "-" * 88)
        print(f"  Grand total: {total}")
        print()
    finally:
        db.close()


if __name__ == "__main__":
    main()
