"""Full Digital SAT exam: blueprints, timing, routing, scoring, results."""
from datetime import datetime, timedelta
from uuid import UUID
import random

from sqlalchemy.orm import Session

from app.core.config import (
    settings,
    EXAM_MODULE_SPEC,
    EXAM_M1_DIFFICULTY_DISTRIBUTION,
    EXAM_M2_EASY_DISTRIBUTION,
    EXAM_M2_HARD_DISTRIBUTION,
    EXAM_RW_DOMAIN_WEIGHTS,
    EXAM_MATH_DOMAIN_WEIGHTS,
)
from app.models.attempt import Attempt
from app.models.exam_module_question import ExamModuleQuestion, ExamQuestionStatusEnum
from app.models.exam_result import ExamResult
from app.models.question_bank import QuestionBank, QualityStatusEnum
from app.models.session import Session as SessionModel, SessionModeEnum, SessionStatusEnum
from app.models.skill import Skill, SectionEnum, DomainEnum
from app.services.question_service import (
    get_excluded_question_ids_for_user,
    get_question,
    get_or_create_question,
    get_question_for_exam,
)
from app.services.question_generation import generate_question
from app.services.practice_service import update_mastery_from_exam_result

# --- No-repeat: for first N exams, no question is repeated; after N exams, repeats allowed ---


def _completed_exam_count(db: Session, user_id: UUID) -> int:
    """Number of completed (ENDED) exam sessions for this user."""
    return db.query(SessionModel).filter(
        SessionModel.user_id == user_id,
        SessionModel.mode == SessionModeEnum.EXAM,
        SessionModel.status == SessionStatusEnum.ENDED,
    ).count()


def _question_ids_from_exam_session(db: Session, session_id: UUID) -> set[UUID]:
    """All question_ids that appeared in this exam session (from exam_module_questions)."""
    rows = (
        db.query(ExamModuleQuestion.question_id)
        .filter(ExamModuleQuestion.session_id == session_id)
        .all()
    )
    return set(r[0] for r in rows) if rows else set()


def _question_ids_from_all_completed_exams(db: Session, user_id: UUID) -> set[UUID]:
    """All question_ids from every completed (ENDED) exam session for this user (ordered by started_at)."""
    session_ids = [
        r[0] for r in
        db.query(SessionModel.id)
        .filter(
            SessionModel.user_id == user_id,
            SessionModel.mode == SessionModeEnum.EXAM,
            SessionModel.status == SessionStatusEnum.ENDED,
        )
        .order_by(SessionModel.started_at.asc())
        .all()
    ]
    if not session_ids:
        return set()
    out = set()
    for sid in session_ids:
        out |= _question_ids_from_exam_session(db, sid)
    return out


def get_exam_excluded_question_ids(db: Session, user_id: UUID) -> set[UUID]:
    """For the first exam_first_exam_no_repeat_until_sessions exams: exclude every question from any previous exam (no repeats). After that, only exclude last 100 attempts."""
    excluded = get_excluded_question_ids_for_user(db, user_id, 100)
    threshold = settings.exam_first_exam_no_repeat_until_sessions
    completed_count = _completed_exam_count(db, user_id)
    if completed_count < threshold:
        excluded |= _question_ids_from_all_completed_exams(db, user_id)
    return excluded


# --- Domain balancing: skills by domain with weights ---


def _skills_by_domain(db: Session, section: SectionEnum) -> dict[str, list[UUID]]:
    skills = db.query(Skill).filter(Skill.section == section).all()
    by_domain: dict[str, list[UUID]] = {}
    for s in skills:
        d = s.domain.value
        by_domain.setdefault(d, []).append(s.id)
    return by_domain


def _domain_weights_for_section(section: SectionEnum) -> dict[str, float]:
    """Return SAT-aligned domain weights for the section."""
    return EXAM_MATH_DOMAIN_WEIGHTS if section == SectionEnum.MATH else EXAM_RW_DOMAIN_WEIGHTS


def _weighted_domain_order(section: SectionEnum, num_questions: int) -> list[str]:
    """Interleave domains by section-specific weights; return list of domain names of length num_questions."""
    weights = list(_domain_weights_for_section(section).items())
    if not weights:
        return ["Algebra"] * num_questions if section == SectionEnum.MATH else ["Information and Ideas"] * num_questions
    total_w = sum(w for _, w in weights)
    counts = [max(0, int(num_questions * (w / total_w))) for _, w in weights]
    diff = num_questions - sum(counts)
    for i in range(diff):
        counts[i % len(counts)] += 1
    order = []
    for i, (d, _) in enumerate(weights):
        order.extend([d] * counts[i])
    random.shuffle(order)
    return order[:num_questions]


def _difficulty_sequence(distribution: list[tuple[int, float]], num: int) -> list[int]:
    out = []
    for d, p in distribution:
        out.extend([d] * max(0, int(num * p)))
    while len(out) < num:
        out.append(distribution[0][0])
    random.shuffle(out)
    return out[:num]


# --- Build blueprint for one module (create questions module-wise) ---


def _get_exam_question_with_fallbacks(
    db: Session,
    section: SectionEnum,
    by_domain: dict[str, list[UUID]],
    domain_name: str,
    difficulty: int,
    user_id: UUID,
    excluded: set[UUID],
) -> QuestionBank:
    """
    Get one question for this module: APPROVED first (passing validation), then DRAFT, then generate.
    All returned questions pass quality validation (no placeholders). Tries primary skill/difficulty,
    then other skills in domain, then other difficulties. Raises if none found.
    """
    skill_ids = by_domain.get(domain_name)
    if not skill_ids:
        # Fallback: use first domain that has skills for this section
        skill_ids = next((ids for ids in by_domain.values() if ids), None)
    if not skill_ids:
        skill_ids = [s.id for s in db.query(Skill).filter(Skill.section == section).all()]
    if not skill_ids:
        raise ValueError(
            "No skills found for this section. Seed skills and add questions."
        )
    random.shuffle(skill_ids)

    def gen(sess, sid, diff):
        return generate_question(sess, sid, diff)

    for skill_id in skill_ids:
        try:
            q = get_question_for_exam(
                db,
                gen,
                section=section,
                skill_id=skill_id,
                difficulty=difficulty,
                user_id=user_id,
                exclude_question_ids=excluded,
            )
            if q:
                return q
        except ValueError:
            pass

    for d in [3, 2, 4, 1, 5]:
        if d == difficulty:
            continue
        for skill_id in skill_ids:
            try:
                q = get_question_for_exam(
                    db,
                    gen,
                    section=section,
                    skill_id=skill_id,
                    difficulty=d,
                    user_id=user_id,
                    exclude_question_ids=excluded,
                )
                if q:
                    return q
            except ValueError:
                pass

    raise ValueError(
        "Not enough valid questions in the bank for this module (APPROVED/DRAFT with no placeholders). "
        "Add or generate questions and ensure they pass validation."
    )


def build_module_blueprint(
    db: Session,
    session_id: UUID,
    user_id: UUID,
    section: SectionEnum,
    module_number: int,
    use_hard_band: bool,
) -> None:
    """Build and persist exam_module_questions. Uses APPROVED first, then DRAFT (both validated); generates if needed. All questions pass quality validation."""
    key = (section.value, module_number)
    num_q, time_limit = EXAM_MODULE_SPEC.get(key, (27, 32 * 60))
    excluded = get_exam_excluded_question_ids(db, user_id)
    # Also exclude questions already selected in this in-progress exam session
    # so questions can't repeat across modules/sections within the same exam.
    excluded |= _question_ids_from_exam_session(db, session_id)

    by_domain = _skills_by_domain(db, section)
    domain_order = _weighted_domain_order(section, num_q)
    if module_number == 1:
        diff_seq = _difficulty_sequence(EXAM_M1_DIFFICULTY_DISTRIBUTION, num_q)
    else:
        dist = EXAM_M2_HARD_DISTRIBUTION if use_hard_band else EXAM_M2_EASY_DISTRIBUTION
        diff_seq = _difficulty_sequence(dist, num_q)

    section_weights = _domain_weights_for_section(section)
    fallback_domain = next(iter(section_weights), "Algebra" if section == SectionEnum.MATH else "Information and Ideas")
    for order in range(num_q):
        domain_name = domain_order[order] if order < len(domain_order) else fallback_domain
        difficulty = diff_seq[order] if order < len(diff_seq) else 3
        q = _get_exam_question_with_fallbacks(
            db,
            section=section,
            by_domain=by_domain,
            domain_name=domain_name,
            difficulty=difficulty,
            user_id=user_id,
            excluded=excluded,
        )
        excluded.add(q.id)
        emq = ExamModuleQuestion(
            session_id=session_id,
            section=section,
            module_number=module_number,
            question_order=order,
            question_id=q.id,
            status=ExamQuestionStatusEnum.UNSEEN,
        )
        db.add(emq)
    db.commit()


# --- Module time check ---


def get_module_time_remaining(db: Session, session_id: UUID, user_id: UUID) -> int | None:
    """Seconds remaining in current module, or None if no active module / expired."""
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == user_id,
        SessionModel.mode == SessionModeEnum.EXAM,
        SessionModel.status == SessionStatusEnum.ACTIVE,
    ).first()
    if not session or session.current_module_started_at is None or session.current_module_time_limit_sec is None:
        return None
    started = session.current_module_started_at
    # Use naive UTC for elapsed
    if started.tzinfo:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        elapsed = (now - started).total_seconds()
    else:
        elapsed = (datetime.utcnow() - started).total_seconds()
    remaining = int(session.current_module_time_limit_sec - elapsed)
    return max(0, remaining) if remaining >= 0 else 0


def is_module_time_expired(db: Session, session_id: UUID, user_id: UUID) -> bool:
    remaining = get_module_time_remaining(db, session_id, user_id)
    return remaining is not None and remaining == 0


# --- Exam flow ---


def start_exam(db: Session, user_id: UUID) -> SessionModel:
    """Create exam session; first module (RW 1) blueprint built and started. Raises ValueError if user not found."""
    from app.services.user_service import get_user_by_id
    if get_user_by_id(db, user_id) is None:
        raise ValueError("USER_NOT_FOUND")
    session = SessionModel(
        user_id=user_id,
        mode=SessionModeEnum.EXAM,
        status=SessionStatusEnum.ACTIVE,
        current_section=SectionEnum.RW,
        current_module=1,
        current_module_started_at=datetime.utcnow(),
        current_module_time_limit_sec=EXAM_MODULE_SPEC.get(("RW", 1), (27, 32 * 60))[1],
    )
    db.add(session)
    db.flush()
    build_module_blueprint(db, session.id, user_id, SectionEnum.RW, 1, use_hard_band=False)
    db.commit()
    db.refresh(session)
    return session


def get_next_exam_question(db: Session, session_id: UUID, user_id: UUID) -> tuple[ExamModuleQuestion, QuestionBank] | None:
    """Return next UNSEEN question in current module from exam_module_questions (by question_order)."""
    if is_module_time_expired(db, session_id, user_id):
        return None  # caller will return 409
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == user_id,
        SessionModel.mode == SessionModeEnum.EXAM,
        SessionModel.status == SessionStatusEnum.ACTIVE,
    ).first()
    if not session or session.current_section is None or session.current_module is None:
        return None
    emq = (
        db.query(ExamModuleQuestion)
        .filter(
            ExamModuleQuestion.session_id == session_id,
            ExamModuleQuestion.section == session.current_section,
            ExamModuleQuestion.module_number == session.current_module,
            ExamModuleQuestion.status == ExamQuestionStatusEnum.UNSEEN,
        )
        .order_by(ExamModuleQuestion.question_order)
        .first()
    )
    if not emq:
        return None
    q = db.query(QuestionBank).filter(QuestionBank.id == emq.question_id).first()
    if not q:
        return None
    emq.status = ExamQuestionStatusEnum.ANSWERED
    emq.served_at = datetime.utcnow()
    db.commit()
    db.refresh(emq)
    return (emq, q)


def submit_exam_answer(
    db: Session,
    session_id: UUID,
    user_id: UUID,
    question_id: UUID,
    user_answer: str,
    time_taken_sec: int | None = None,
) -> dict:
    """Record attempt; return is_correct, correct_answer, explanation. 409 if time expired."""
    if is_module_time_expired(db, session_id, user_id):
        raise ValueError("MODULE_TIME_EXPIRED")
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == user_id,
        SessionModel.mode == SessionModeEnum.EXAM,
    ).first()
    if not session:
        raise ValueError("Session not found")
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise ValueError("Question not found")
    correct = question.correct_answer.strip().upper() == (user_answer or "").strip().upper()
    attempt = Attempt(
        session_id=session_id,
        question_id=question_id,
        user_answer=user_answer,
        is_correct=correct,
        time_taken_sec=time_taken_sec,
    )
    db.add(attempt)
    emq = (
        db.query(ExamModuleQuestion)
        .filter(
            ExamModuleQuestion.session_id == session_id,
            ExamModuleQuestion.question_id == question_id,
        )
        .first()
    )
    if emq:
        emq.status = ExamQuestionStatusEnum.ANSWERED
        emq.answered_at = datetime.utcnow()
    db.commit()
    return {
        "is_correct": correct,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation or "",
    }


BREAK_DURATION_SEC = 10 * 60  # 10-minute break between R&W and Math


def advance_exam(db: Session, session_id: UUID, user_id: UUID) -> dict:
    """Move to next module or end exam. Builds M2 blueprint when entering M2; sets timers. Returns BREAK for 10-min break between R&W and Math."""
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == user_id,
        SessionModel.mode == SessionModeEnum.EXAM,
        SessionModel.status == SessionStatusEnum.ACTIVE,
    ).first()
    if not session:
        raise ValueError("Session not found")

    # If currently in break, end break and start Math Module 1
    if session.break_ends_at is not None:
        session.break_ends_at = None
        session.current_section = SectionEnum.MATH
        session.current_module = 1
        session.current_module_started_at = datetime.utcnow()
        session.current_module_time_limit_sec = EXAM_MODULE_SPEC.get(("MATH", 1), (22, 35 * 60))[1]
        build_module_blueprint(db, session_id, user_id, SectionEnum.MATH, 1, use_hard_band=False)
        db.commit()
        db.refresh(session)
        return {
            "status": "ACTIVE",
            "current_section": session.current_section.value,
            "current_module": session.current_module,
            "time_limit_sec": session.current_module_time_limit_sec,
        }

    section = session.current_section
    module = session.current_module or 1
    if section == SectionEnum.RW and module == 1:
        # Compute RW M1 accuracy for routing
        rw1_question_ids = [e.question_id for e in db.query(ExamModuleQuestion).filter(
            ExamModuleQuestion.session_id == session_id,
            ExamModuleQuestion.section == SectionEnum.RW,
            ExamModuleQuestion.module_number == 1,
        ).all()]
        attempts_rw1 = db.query(Attempt).filter(
            Attempt.session_id == session_id,
            Attempt.question_id.in_(rw1_question_ids),
        ).all() if rw1_question_ids else []
        correct_rw1 = sum(1 for a in attempts_rw1 if a.is_correct)
        total_rw1 = len(attempts_rw1)
        accuracy = correct_rw1 / total_rw1 if total_rw1 else 0
        use_hard = accuracy >= settings.exam_route_threshold
        session.current_section = SectionEnum.RW
        session.current_module = 2
        session.current_module_started_at = datetime.utcnow()
        session.current_module_time_limit_sec = EXAM_MODULE_SPEC.get(("RW", 2), (27, 32 * 60))[1]
        build_module_blueprint(db, session_id, user_id, SectionEnum.RW, 2, use_hard_band=use_hard)
    elif section == SectionEnum.RW and module == 2:
        # 10-minute break between Reading & Writing and Math (official SAT format)
        session.break_ends_at = datetime.utcnow() + timedelta(seconds=BREAK_DURATION_SEC)
        db.commit()
        db.refresh(session)
        # Serialize break_ends_at as UTC so the client parses it correctly (JS treats ISO without Z as local time).
        if session.break_ends_at:
            iso = session.break_ends_at.isoformat()
            break_ends_at_iso = iso if ("Z" in iso or "+" in iso) else iso + "Z"
        else:
            break_ends_at_iso = None
        return {
            "status": "BREAK",
            "break_duration_sec": BREAK_DURATION_SEC,
            "break_ends_at": break_ends_at_iso,
        }
    elif section == SectionEnum.MATH and module == 1:
        # Route Math M2
        math1_question_ids = [e.question_id for e in db.query(ExamModuleQuestion).filter(
            ExamModuleQuestion.session_id == session_id,
            ExamModuleQuestion.section == SectionEnum.MATH,
            ExamModuleQuestion.module_number == 1,
        ).all()]
        attempts_math1 = db.query(Attempt).filter(
            Attempt.session_id == session_id,
            Attempt.question_id.in_(math1_question_ids),
        ).all() if math1_question_ids else []
        correct_math1 = sum(1 for a in attempts_math1 if a.is_correct)
        total_math1 = len(attempts_math1)
        accuracy = correct_math1 / total_math1 if total_math1 else 0
        use_hard = accuracy >= settings.exam_route_threshold
        session.current_section = SectionEnum.MATH
        session.current_module = 2
        session.current_module_started_at = datetime.utcnow()
        session.current_module_time_limit_sec = EXAM_MODULE_SPEC.get(("MATH", 2), (22, 35 * 60))[1]
        build_module_blueprint(db, session_id, user_id, SectionEnum.MATH, 2, use_hard_band=use_hard)
    else:
        # Math M2 done -> end exam
        _finalize_exam(db, session_id, user_id)
        return {"status": "ENDED", "message": "Exam complete"}
    db.commit()
    db.refresh(session)
    return {
        "status": "ACTIVE",
        "current_section": session.current_section.value,
        "current_module": session.current_module,
        "time_limit_sec": session.current_module_time_limit_sec,
    }


def _module_correct_counts(db: Session, session_id: UUID) -> tuple[int, int, int, int]:
    """RW M1, RW M2, Math M1, Math M2 correct counts."""
    rw1 = rw2 = math1 = math2 = 0
    attempts = db.query(Attempt).filter(Attempt.session_id == session_id).all()
    emqs = {e.question_id: (e.section, e.module_number) for e in db.query(ExamModuleQuestion).filter(ExamModuleQuestion.session_id == session_id).all()}
    for a in attempts:
        key = emqs.get(a.question_id)
        if not key:
            continue
        sec, mod = key
        if not a.is_correct:
            continue
        if sec == SectionEnum.RW and mod == 1:
            rw1 += 1
        elif sec == SectionEnum.RW and mod == 2:
            rw2 += 1
        elif sec == SectionEnum.MATH and mod == 1:
            math1 += 1
        else:
            math2 += 1
    return (rw1, rw2, math1, math2)


def _domain_breakdown_from_session(db: Session, session_id: UUID) -> dict:
    """Build domain_breakdown_json: skill_id -> correct count (or score 0-100) for skills touched in this exam."""
    from collections import defaultdict
    attempts = db.query(Attempt).filter(Attempt.session_id == session_id).all()
    by_skill: dict[str, list[bool]] = defaultdict(list)
    for a in attempts:
        q = db.query(QuestionBank).filter(QuestionBank.id == a.question_id).first()
        if q:
            by_skill[str(q.skill_id)].append(a.is_correct)
    breakdown = {}
    for skill_id_str, corrects in by_skill.items():
        total = len(corrects)
        correct = sum(corrects)
        pct = round(100 * correct / total) if total else 0
        breakdown[skill_id_str] = pct
    return breakdown


def _finalize_exam(db: Session, session_id: UUID, user_id: UUID) -> None:
    """Compute scores, write exam_results, set has_taken_baseline_exam, update mastery from domain_breakdown."""
    from app.models.user import User
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        return
    session.status = SessionStatusEnum.ENDED
    session.ended_at = datetime.utcnow()
    rw1, rw2, math1, math2 = _module_correct_counts(db, session_id)
    rw_total = rw1 + rw2
    math_total = math1 + math2
    # RW_scaled = 200 + round((rw_correct/54)*600) clamp 200..800
    rw_scaled = min(800, max(200, 200 + round((rw_total / 54) * 600)))
    math_scaled = min(800, max(200, 200 + round((math_total / 44) * 600)))
    total_scaled = min(1600, max(400, rw_scaled + math_scaled))
    domain_breakdown = _domain_breakdown_from_session(db, session_id)
    result = ExamResult(
        session_id=session_id,
        user_id=user_id,
        rw_module1_correct=rw1,
        rw_module2_correct=rw2,
        math_module1_correct=math1,
        math_module2_correct=math2,
        rw_total_correct=rw_total,
        math_total_correct=math_total,
        domain_breakdown_json=domain_breakdown,
        rw_scaled=rw_scaled,
        math_scaled=math_scaled,
        total_scaled=total_scaled,
    )
    db.add(result)
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.has_taken_baseline_exam = True
    update_mastery_from_exam_result(db, user_id, domain_breakdown)
    db.commit()


def get_exam_history(db: Session, user_id: UUID, limit: int = 50) -> list[dict]:
    """List past completed exams for the user, newest first. Each item has session_id, ended_at, scores for history page."""
    results = (
        db.query(ExamResult, SessionModel.ended_at)
        .join(SessionModel, ExamResult.session_id == SessionModel.id)
        .filter(
            ExamResult.user_id == user_id,
            SessionModel.mode == SessionModeEnum.EXAM,
            SessionModel.status == SessionStatusEnum.ENDED,
        )
        .order_by(ExamResult.created_at.desc())
        .limit(limit)
        .all()
    )
    out = []
    for r, ended_at in results:
        out.append({
            "session_id": str(r.session_id),
            "ended_at": ended_at.isoformat() if ended_at else (r.created_at.isoformat() if r.created_at else None),
            "total_scaled": r.total_scaled,
            "rw_scaled": r.rw_scaled,
            "math_scaled": r.math_scaled,
            "rw_total_correct": r.rw_total_correct,
            "math_total_correct": r.math_total_correct,
        })
    return out


def _skills_breakdown_from_session(db: Session, session_id: UUID) -> list[dict]:
    """Build list of { skill_id, skill_name, correct, total } for exam result display."""
    from collections import defaultdict
    attempts = db.query(Attempt).filter(Attempt.session_id == session_id).all()
    by_skill: dict[str, list[bool]] = defaultdict(list)
    for a in attempts:
        q = db.query(QuestionBank).filter(QuestionBank.id == a.question_id).first()
        if q:
            by_skill[str(q.skill_id)].append(a.is_correct)
    if not by_skill:
        return []
    skill_ids = list(by_skill.keys())
    skills_map = {str(s.id): s.name for s in db.query(Skill).filter(Skill.id.in_([UUID(sid) for sid in skill_ids])).all()}
    return [
        {
            "skill_id": skill_id,
            "skill_name": skills_map.get(skill_id, "Unknown"),
            "correct": sum(by_skill[skill_id]),
            "total": len(by_skill[skill_id]),
        }
        for skill_id in skill_ids
    ]


def get_exam_result(db: Session, session_id: UUID, user_id: UUID) -> dict | None:
    r = db.query(ExamResult).filter(ExamResult.session_id == session_id, ExamResult.user_id == user_id).first()
    if not r:
        return None
    skills_breakdown = _skills_breakdown_from_session(db, session_id)
    return {
        "session_id": str(r.session_id),
        "rw_module1_correct": r.rw_module1_correct,
        "rw_module2_correct": r.rw_module2_correct,
        "math_module1_correct": r.math_module1_correct,
        "math_module2_correct": r.math_module2_correct,
        "rw_total_correct": r.rw_total_correct,
        "math_total_correct": r.math_total_correct,
        "rw_scaled": r.rw_scaled,
        "math_scaled": r.math_scaled,
        "total_scaled": r.total_scaled,
        "domain_breakdown_json": r.domain_breakdown_json,
        "skills_breakdown": skills_breakdown,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def get_exam_review(db: Session, session_id: UUID, user_id: UUID) -> dict | None:
    """Return detailed analysis and all 98 questions with user answer and explanation for a completed exam. None if not found or not ended."""
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == user_id,
        SessionModel.mode == SessionModeEnum.EXAM,
        SessionModel.status == SessionStatusEnum.ENDED,
    ).first()
    if not session:
        return None
    result = get_exam_result(db, session_id, user_id)
    if not result:
        return None

    emqs = (
        db.query(ExamModuleQuestion)
        .filter(ExamModuleQuestion.session_id == session_id)
        .all()
    )
    section_order = [SectionEnum.RW, SectionEnum.MATH]
    emqs_sorted = sorted(
        emqs,
        key=lambda e: (section_order.index(e.section), e.module_number, e.question_order),
    )

    attempts_by_question = {}
    for a in db.query(Attempt).filter(Attempt.session_id == session_id).all():
        attempts_by_question[a.question_id] = {"user_answer": a.user_answer, "is_correct": a.is_correct}

    question_ids = [emq.question_id for emq in emqs_sorted]
    questions_map = {}
    for q in db.query(QuestionBank).filter(QuestionBank.id.in_(question_ids)).all():
        questions_map[q.id] = q
    skill_ids = {q.skill_id for q in questions_map.values()}
    skills_map = {}
    for s in db.query(Skill).filter(Skill.id.in_(skill_ids)).all():
        skills_map[s.id] = s.name

    by_module = [
        {
            "section": "RW",
            "module": 1,
            "correct": result["rw_module1_correct"],
            "total": 27,
        },
        {
            "section": "RW",
            "module": 2,
            "correct": result["rw_module2_correct"],
            "total": 27,
        },
        {
            "section": "MATH",
            "module": 1,
            "correct": result["math_module1_correct"],
            "total": 22,
        },
        {
            "section": "MATH",
            "module": 2,
            "correct": result["math_module2_correct"],
            "total": 22,
        },
    ]

    questions = []
    for idx, emq in enumerate(emqs_sorted):
        q = questions_map.get(emq.question_id)
        if not q:
            continue
        att = attempts_by_question.get(emq.question_id, {})
        choices = q.choices_json or {}
        questions.append({
            "index": idx + 1,
            "section": emq.section.value,
            "module_number": emq.module_number,
            "question_order": emq.question_order,
            "question_id": str(q.id),
            "question_text": q.question_text,
            "choices": choices,
            "correct_answer": q.correct_answer,
            "user_answer": att.get("user_answer"),
            "is_correct": att.get("is_correct", False),
            "explanation": q.explanation,
            "skill_id": str(q.skill_id),
            "skill_name": skills_map.get(q.skill_id, ""),
        })

    return {
        "result": result,
        "analysis": {
            "by_module": by_module,
            "total_correct": result["rw_total_correct"] + result["math_total_correct"],
            "total_questions": 98,
        },
        "questions": questions,
    }


def get_weak_areas(db: Session, user_id: UUID, top_n: int = 5) -> list[dict]:
    """Return weakest domains/skills from latest exam result and recommend skills."""
    result = db.query(ExamResult).filter(ExamResult.user_id == user_id).order_by(ExamResult.created_at.desc()).first()
    if not result or not result.domain_breakdown_json:
        return []
    breakdown = result.domain_breakdown_json
    sorted_skills = sorted(breakdown.items(), key=lambda x: x[1])
    out = []
    for skill_id_str, score in sorted_skills[:top_n]:
        try:
            sid = UUID(skill_id_str)
        except (ValueError, TypeError):
            continue
        skill = db.query(Skill).filter(Skill.id == sid).first()
        if skill:
            out.append({
                "skill_id": str(skill.id),
                "skill_name": skill.name,
                "section": skill.section.value,
                "domain": skill.domain.value,
                "score_from_exam": score,
            })
    return out
