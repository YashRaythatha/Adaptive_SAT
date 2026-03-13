"""
Check for duplicate questions in the question bank (same question_text content).

  python -m app.scripts.check_duplicate_questions

Run from repo root or with PYTHONPATH=backend.
"""
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.question_bank import QuestionBank


def main() -> None:
    db = SessionLocal()
    try:
        rows = db.query(QuestionBank.id, QuestionBank.question_text).all()
        # Group by normalized content: strip whitespace
        by_text: dict[str, list[str]] = defaultdict(list)
        for qid, text in rows:
            normalized = (text or "").strip()
            by_text[normalized].append(str(qid))

        duplicates = {k: v for k, v in by_text.items() if len(v) > 1}
        total = len(rows)
        dup_count = sum(len(ids) for ids in duplicates.values())
        num_groups = len(duplicates)

        print("Question bank duplicate check (same question_text after trim)")
        print("=" * 60)
        print(f"Total questions: {total}")
        print(f"Duplicate groups (same text): {num_groups}")
        print(f"Questions involved in duplicates: {dup_count}")
        print()

        if not duplicates:
            print("No duplicate questions found.")
            return

        for i, (text, ids) in enumerate(duplicates.items(), 1):
            preview = (text[:80] + "...") if len(text) > 80 else text
            print(f"Group {i} ({len(ids)} copies):")
            print(f"  Text: {preview}")
            print(f"  IDs:  {', '.join(ids)}")
            print()
    finally:
        db.close()


if __name__ == "__main__":
    main()
