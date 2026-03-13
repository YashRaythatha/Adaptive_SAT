"""
Check all questions in the question bank for validity and consistency.
Run: python -m app.scripts.check_question_bank
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.question_bank import QuestionBank
from app.models.skill import Skill
from app.services.question_service import (
    EXAM_MIN_CHOICE_LEN,
    EXAM_MIN_EXPLANATION_LEN,
    EXAM_MIN_QUESTION_LEN,
    PLACEHOLDER_PATTERNS,
    is_placeholder_or_low_quality,
)

# Only flag when explanation unambiguously states THE correct answer (not when discussing wrong options).
# Match: "correct answer is X", "the answer is X", "answer is X", or "X is correct" (not "Option B and D").
EXPLANATION_STATED_ANSWER_PATTERNS = [
    re.compile(r"(?:correct\s+answer\s+is|the\s+answer\s+is|answer\s+is)\s+([A-D])(?:\s|\.|,|\)|$)", re.IGNORECASE),
    re.compile(r"(?<!\w)([A-D])\s+is\s+correct", re.IGNORECASE),
]


def check_question(q: QuestionBank) -> list[str]:
    """Return list of issue messages for this question (empty if OK)."""
    issues: list[str] = []

    # correct_answer
    ans = (q.correct_answer or "").strip().upper()
    if ans not in ("A", "B", "C", "D"):
        issues.append(f"correct_answer invalid: {q.correct_answer!r}")

    # choices_json
    choices = q.choices_json or {}
    if not isinstance(choices, dict):
        issues.append("choices_json is not a dict")
    else:
        for key in ("A", "B", "C", "D"):
            if key not in choices:
                issues.append(f"missing choice key {key}")
            else:
                val = (choices.get(key) or "").strip()
                if len(val) < EXAM_MIN_CHOICE_LEN:
                    issues.append(f"choice {key} too short ({len(val)} < {EXAM_MIN_CHOICE_LEN})")
                if PLACEHOLDER_PATTERNS.search(val):
                    issues.append(f"choice {key} contains placeholder")
        if ans in ("A", "B", "C", "D") and ans not in choices:
            issues.append(f"correct_answer {ans} not in choices")

    # question_text
    text = (q.question_text or "").strip()
    if not text:
        issues.append("question_text empty")
    elif len(text) < EXAM_MIN_QUESTION_LEN:
        issues.append(f"question_text too short ({len(text)} < {EXAM_MIN_QUESTION_LEN})")
    if text and PLACEHOLDER_PATTERNS.search(text):
        issues.append("question_text contains placeholder")

    # explanation
    expl = (q.explanation or "").strip()
    if not expl:
        issues.append("explanation empty")
    elif len(expl) < EXAM_MIN_EXPLANATION_LEN:
        issues.append(f"explanation too short ({len(expl)} < {EXAM_MIN_EXPLANATION_LEN})")
    if expl and PLACEHOLDER_PATTERNS.search(expl):
        issues.append("explanation contains placeholder")
    # Explanation letter vs correct_answer: only if explanation clearly states "the answer is X" or "X is correct"
    if expl and ans in ("A", "B", "C", "D"):
        for pat in EXPLANATION_STATED_ANSWER_PATTERNS:
            for m in pat.finditer(expl):
                stated = m.group(1).upper()
                if stated != ans:
                    issues.append(f"explanation says '{stated}' but correct_answer is '{ans}'")

    # difficulty
    if not (1 <= (q.difficulty_llm or 0) <= 5):
        issues.append(f"difficulty_llm out of range: {q.difficulty_llm}")

    return issues


def main() -> None:
    db = SessionLocal()
    try:
        questions = db.query(QuestionBank).all()
        total = len(questions)
        valid_count = 0
        by_issue: dict[str, list[str]] = {}
        questions_with_issues: list[tuple[str, list[str]]] = []

        for q in questions:
            qid = str(q.id)
            issues = check_question(q)
            if not issues:
                if not is_placeholder_or_low_quality(q):
                    valid_count += 1
            else:
                questions_with_issues.append((qid, issues))
                for i in issues:
                    by_issue.setdefault(i, []).append(qid)

        # Summary
        print("=" * 60)
        print("QUESTION BANK CHECK")
        print("=" * 60)
        print(f"Total questions: {total}")
        print(f"Valid (exam-ready, no issues): {valid_count}")
        print(f"With at least one issue: {len(questions_with_issues)}")
        print()

        if questions_with_issues:
            print("Issue types (count):")
            for issue, qids in sorted(by_issue.items(), key=lambda x: -len(x[1])):
                print(f"  [{len(qids)}] {issue}")
            print()
            # Show first 15 questions with issues (id + first 2 issues)
            print("Sample questions with issues (first 15):")
            for qid, issues in questions_with_issues[:15]:
                short = "; ".join(issues[:2])
                if len(issues) > 2:
                    short += f" (+{len(issues) - 2} more)"
                print(f"  {qid[:8]}... : {short}")
        else:
            print("All questions passed checks.")

        # Skill/difficulty coverage (skip skill names if enum/DB mismatch)
        from sqlalchemy import func
        rows = (
            db.query(QuestionBank.skill_id, QuestionBank.difficulty_llm, func.count(QuestionBank.id))
            .filter(QuestionBank.quality_status.in_(["APPROVED", "DRAFT"]))
            .group_by(QuestionBank.skill_id, QuestionBank.difficulty_llm)
            .all()
        )
        try:
            skills = {s.id: s.name for s in db.query(Skill).all()}
        except Exception:
            skills = {}
        print()
        print("Approved/DRAFT counts by skill and difficulty:")
        for skill_id, diff, cnt in sorted(rows, key=lambda r: (str(r[0]), r[1])):
            name = skills.get(skill_id, str(skill_id)[:8] + "...")
            print(f"  {name[:44]} (diff {diff}): {cnt}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
