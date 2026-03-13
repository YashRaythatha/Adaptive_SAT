"""Cache-first question retrieval: APPROVED first, then DRAFT; exclude user's last 100 attempts."""
from uuid import UUID
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.question_bank import QuestionBank, QualityStatusEnum
from app.models.skill import Skill, DomainEnum, SectionEnum

# Exam-quality: minimum lengths and placeholder patterns (case-insensitive)
EXAM_MIN_QUESTION_LEN = 50
EXAM_MIN_CHOICE_LEN = 5
EXAM_MIN_EXPLANATION_LEN = 60
PLACEHOLDER_PATTERNS = re.compile(
    r"placeholder|lorem\s+ipsum|\[?\s*TODO\s*\]?|\[?\s*TBD\s*\]?|\bxxx\b|sample\s+question|example\s+question|dummy\s+text|test\s+question",
    re.IGNORECASE,
)


def get_excluded_question_ids_for_user(db: Session, user_id: UUID, limit: int = 100) -> set[UUID]:
    """Return set of question_ids from user's last `limit` attempts."""
    from app.models.session import Session as SessionModel
    stmt = (
        select(Attempt.question_id)
        .select_from(Attempt)
        .join(SessionModel, Attempt.session_id == SessionModel.id)
        .where(SessionModel.user_id == user_id)
        .order_by(Attempt.created_at.desc())
        .limit(limit)
    )
    result = db.execute(stmt).scalars().all()
    return set(result) if result else set()


def get_question(
    db: Session,
    *,
    section: SectionEnum,
    skill_id: UUID,
    difficulty: int,
    user_id: UUID | None = None,
    skill_ids: list[UUID] | None = None,
    domain: DomainEnum | None = None,
    exclude_question_ids: set[UUID] | None = None,
) -> QuestionBank | None:
    """
    Cache-first: try APPROVED then DRAFT. Exclude question_ids from user's last 100 attempts.
    Filters: section, difficulty, optional skill_ids, optional domain (via skill join).
    """
    excluded = exclude_question_ids or set()
    if user_id:
        excluded |= get_excluded_question_ids_for_user(db, user_id, 100)

    base = (
        db.query(QuestionBank)
        .join(Skill, QuestionBank.skill_id == Skill.id)
        .filter(
            QuestionBank.section == section,
            QuestionBank.skill_id == skill_id,
            QuestionBank.difficulty_llm == difficulty,
        )
    )
    if excluded:
        base = base.filter(QuestionBank.id.notin_(excluded))
    if skill_ids is not None:
        base = base.filter(QuestionBank.skill_id.in_(skill_ids))
    if domain is not None:
        base = base.filter(Skill.domain == domain)

    approved = base.filter(QuestionBank.quality_status == QualityStatusEnum.APPROVED).first()
    if approved:
        return approved
    return base.filter(QuestionBank.quality_status == QualityStatusEnum.DRAFT).first()


def is_placeholder_or_low_quality(q: QuestionBank) -> bool:
    """Return True if question looks like a placeholder or is too short for exam quality."""
    if not q or not q.question_text:
        return True
    text = (q.question_text or "").strip()
    if len(text) < EXAM_MIN_QUESTION_LEN:
        return True
    if PLACEHOLDER_PATTERNS.search(text):
        return True
    choices = q.choices_json or {}
    for key in ("A", "B", "C", "D"):
        val = (choices.get(key) or "").strip()
        if len(val) < EXAM_MIN_CHOICE_LEN:
            return True
        if PLACEHOLDER_PATTERNS.search(val):
            return True
    if (q.correct_answer or "").strip().upper() not in ("A", "B", "C", "D"):
        return True
    expl = (q.explanation or "").strip()
    if len(expl) < EXAM_MIN_EXPLANATION_LEN:
        return True
    if PLACEHOLDER_PATTERNS.search(expl):
        return True
    return False


def count_valid_questions_for_skill_difficulty(
    db: Session, skill_id: UUID, difficulty: int
) -> int:
    """Count APPROVED + DRAFT questions for this skill/difficulty that pass quality check (no placeholders)."""
    base = (
        db.query(QuestionBank)
        .filter(
            QuestionBank.skill_id == skill_id,
            QuestionBank.difficulty_llm == difficulty,
            QuestionBank.quality_status.in_(
                [QualityStatusEnum.APPROVED, QualityStatusEnum.DRAFT]
            ),
        )
    )
    count = 0
    for q in base.all():
        if not is_placeholder_or_low_quality(q):
            count += 1
    return count


def validate_question_content(
    question_text: str,
    choices: dict[str, str],
    correct_answer: str,
    explanation: str,
) -> list[str]:
    """
    Validate question content before storing. Returns list of error messages (empty if valid).
    Use for generation and any path that writes to the question bank.
    """
    errors: list[str] = []
    text = (question_text or "").strip()
    if len(text) < EXAM_MIN_QUESTION_LEN:
        errors.append(f"question_text must be at least {EXAM_MIN_QUESTION_LEN} characters")
    if PLACEHOLDER_PATTERNS.search(text):
        errors.append("question_text contains placeholder or invalid content")
    for key in ("A", "B", "C", "D"):
        val = (choices.get(key) or "").strip()
        if len(val) < EXAM_MIN_CHOICE_LEN:
            errors.append(f"choice {key} must be at least {EXAM_MIN_CHOICE_LEN} characters")
        elif PLACEHOLDER_PATTERNS.search(val):
            errors.append(f"choice {key} contains placeholder or invalid content")
    ans = (correct_answer or "").strip().upper()
    if ans not in ("A", "B", "C", "D"):
        errors.append("correct_answer must be one of A, B, C, D")
    expl = (explanation or "").strip()
    if len(expl) < EXAM_MIN_EXPLANATION_LEN:
        errors.append(f"explanation must be at least {EXAM_MIN_EXPLANATION_LEN} characters")
    if PLACEHOLDER_PATTERNS.search(expl):
        errors.append("explanation contains placeholder or invalid content")
    return errors


def get_question_for_exam(
    db: Session,
    generate_fn,
    *,
    section: SectionEnum,
    skill_id: UUID,
    difficulty: int,
    user_id: UUID | None = None,
    skill_ids: list[UUID] | None = None,
    domain: DomainEnum | None = None,
    exclude_question_ids: set[UUID] | None = None,
) -> QuestionBank:
    """
    Get a question for exam: APPROVED first (passing validation), then DRAFT (passing validation),
    then generate (generate_fn validates before storing). Only returns questions that pass
    quality checks (no placeholders, minimum lengths).
    """
    excluded = exclude_question_ids or set()
    if user_id:
        excluded |= get_excluded_question_ids_for_user(db, user_id, 100)

    base = (
        db.query(QuestionBank)
        .join(Skill, QuestionBank.skill_id == Skill.id)
        .filter(
            QuestionBank.section == section,
            QuestionBank.skill_id == skill_id,
            QuestionBank.difficulty_llm == difficulty,
        )
    )
    if excluded:
        base = base.filter(QuestionBank.id.notin_(excluded))
    if skill_ids is not None:
        base = base.filter(QuestionBank.skill_id.in_(skill_ids))
    if domain is not None:
        base = base.filter(Skill.domain == domain)

    for q in base.filter(QuestionBank.quality_status == QualityStatusEnum.APPROVED).all():
        if not is_placeholder_or_low_quality(q):
            return q
    for q in base.filter(QuestionBank.quality_status == QualityStatusEnum.DRAFT).all():
        if not is_placeholder_or_low_quality(q):
            return q
    return generate_fn(db, skill_id, difficulty)


def get_or_create_question(
    db: Session,
    generate_fn,
    *,
    section: SectionEnum,
    skill_id: UUID,
    difficulty: int,
    user_id: UUID | None = None,
    skill_ids: list[UUID] | None = None,
    domain: DomainEnum | None = None,
    exclude_question_ids: set[UUID] | None = None,
) -> QuestionBank:
    """Get from cache (APPROVED then DRAFT); on miss call generate_fn(skill_id, difficulty)."""
    q = get_question(
        db,
        section=section,
        skill_id=skill_id,
        difficulty=difficulty,
        user_id=user_id,
        skill_ids=skill_ids,
        domain=domain,
        exclude_question_ids=exclude_question_ids,
    )
    if q:
        return q
    return generate_fn(db, skill_id, difficulty)
