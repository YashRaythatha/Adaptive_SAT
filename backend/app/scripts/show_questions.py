"""
Print question bank entries by ID (for inspecting specific questions).

  python -m app.scripts.show_questions <id1> [id2 ...]
  python -m app.scripts.show_questions --file ids.txt

  --file   Path to file with one question UUID per line.

Run from repo root or with PYTHONPATH=backend.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.question_bank import QuestionBank


def show_question(q) -> None:
    """Print one question's details."""
    print(f"\n{'='*60}")
    print(f"ID:       {q.id}")
    print(f"Section:  {q.section.value}  |  Difficulty: {q.difficulty_llm}  |  Status: {q.quality_status.value}")
    print(f"{'='*60}")
    print("QUESTION:")
    print((q.question_text or "").strip())
    print("\nCHOICES:")
    choices = q.choices_json or {}
    for k in ["A", "B", "C", "D"]:
        v = (choices.get(k) or "").strip()
        mark = "  [CORRECT]" if (q.correct_answer or "").strip().upper() == k else ""
        print(f"  {k}. {v}{mark}")
    print(f"\nCorrect answer: {(q.correct_answer or '').strip()}")
    expl = (q.explanation or "").strip()
    if expl:
        print(f"Explanation: {expl[:300]}{'...' if len(expl) > 300 else ''}")
    print()


def run(ids: list[str]) -> None:
    db = SessionLocal()
    try:
        from uuid import UUID
        found = 0
        for s in ids:
            s = s.strip()
            if not s:
                continue
            try:
                uid = UUID(s)
            except ValueError:
                print(f"Invalid UUID: {s}", file=sys.stderr)
                continue
            q = db.query(QuestionBank).filter(QuestionBank.id == uid).first()
            if not q:
                print(f"Not found: {s}", file=sys.stderr)
                continue
            show_question(q)
            found += 1
        if not found:
            print("No questions found.")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Print question bank entries by ID.")
    parser.add_argument("ids", nargs="*", help="Question UUID(s)")
    parser.add_argument("--file", type=str, help="File with one UUID per line")
    args = parser.parse_args()
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            ids = [line.strip() for line in f if line.strip()]
    else:
        ids = args.ids
    if not ids:
        print("Give question ID(s) as arguments or --file <path>")
        sys.exit(1)
    run(ids)


if __name__ == "__main__":
    main()
