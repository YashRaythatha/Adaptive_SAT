"""
Deduplicate question_bank by question_text: keep one row per (trimmed) text,
update attempts and exam_module_questions to point to the kept id, then delete duplicates.

  python -m app.scripts.dedupe_questions
  python -m app.scripts.dedupe_questions --dry-run   # report only, no writes

Run from repo root or with PYTHONPATH=backend.
"""
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.attempt import Attempt
from app.models.exam_module_question import ExamModuleQuestion
from app.models.question_bank import QuestionBank, QualityStatusEnum


def _choose_canonical(questions: list[QuestionBank]) -> QuestionBank:
    """Pick one to keep: prefer APPROVED, then oldest by created_at, then lowest id."""
    def key(q: QuestionBank):
        status_rank = 0 if q.quality_status == QualityStatusEnum.APPROVED else 1
        created = q.created_at or __import__("datetime").datetime.min.replace(tzinfo=__import__("datetime").timezone.utc)
        return (status_rank, created, str(q.id))
    return min(questions, key=key)


def run(dry_run: bool = False) -> None:
    db = SessionLocal()
    try:
        rows = db.query(QuestionBank.id, QuestionBank.question_text, QuestionBank.quality_status, QuestionBank.created_at).all()
        by_text: dict[str, list[tuple]] = defaultdict(list)
        for qid, text, status, created in rows:
            normalized = (text or "").strip()
            by_text[normalized].append((qid, status, created))

        duplicate_groups = {k: v for k, v in by_text.items() if len(v) > 1}
        if not duplicate_groups:
            print("No duplicate question_text groups found.")
            return

        total_duplicate_rows = sum(len(ids) - 1 for ids in duplicate_groups.values())  # one kept per group
        print(f"Found {len(duplicate_groups)} duplicate groups ({total_duplicate_rows} rows to remove).")
        if dry_run:
            print("DRY RUN: no changes made.")
            for i, (text, group) in enumerate(duplicate_groups.items(), 1):
                preview = (text[:60] + "...") if len(text) > 60 else text
                ids = [str(x[0]) for x in group]
                print(f"  Group {i}: {len(ids)} copies – {preview}")
            return

        # Load full rows for canonical choice
        all_qs = {r.id: r for r in db.query(QuestionBank).all()}
        updated_attempts = 0
        updated_emq = 0
        deleted = 0

        for normalized_text, group_tuples in duplicate_groups.items():
            group_ids = [t[0] for t in group_tuples]
            questions = [all_qs[qid] for qid in group_ids if qid in all_qs]
            if len(questions) < 2:
                continue
            canonical = _choose_canonical(questions)
            canonical_id = canonical.id
            duplicate_ids = [q.id for q in questions if q.id != canonical_id]

            for dup_id in duplicate_ids:
                # Point attempts to canonical
                n_attempts = db.query(Attempt).filter(Attempt.question_id == dup_id).update(
                    {"question_id": canonical_id}, synchronize_session="fetch"
                )
                updated_attempts += n_attempts
                # Point exam_module_questions to canonical
                n_emq = db.query(ExamModuleQuestion).filter(ExamModuleQuestion.question_id == dup_id).update(
                    {"question_id": canonical_id}, synchronize_session="fetch"
                )
                updated_emq += n_emq
                dup_row = db.get(QuestionBank, dup_id)
                if dup_row:
                    db.delete(dup_row)
                    deleted += 1

        db.commit()
        print(f"Updated attempts: {updated_attempts} rows → canonical question_id")
        print(f"Updated exam_module_questions: {updated_emq} rows → canonical question_id")
        print(f"Deleted duplicate questions: {deleted}")
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    run(dry_run=dry_run)
