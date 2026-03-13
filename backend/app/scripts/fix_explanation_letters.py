"""
Fix explanations that state a different answer letter than the stored correct_answer.
Run once to normalize existing questions: python -m app.scripts.fix_explanation_letters
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.question_bank import QuestionBank
from app.services.question_generation import _normalize_explanation_to_stored_answer


def main() -> None:
    db = SessionLocal()
    try:
        questions = db.query(QuestionBank).all()
        updated = 0
        for q in questions:
            if not q.explanation:
                continue
            stored = (q.correct_answer or "").strip().upper()
            if stored not in ("A", "B", "C", "D"):
                continue
            new_explanation = _normalize_explanation_to_stored_answer(q.explanation, stored)
            if new_explanation != q.explanation:
                q.explanation = new_explanation
                updated += 1
        db.commit()
        print(f"Normalized explanation letter for {updated} questions.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
