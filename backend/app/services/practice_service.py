"""Practice session: start, next question, answer (with mastery update), end. Targeted practice by topic with 10-20 cap."""
from datetime import date, datetime
from uuid import UUID
import random

from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.practice_topic_summary import PracticeTopicSummary
from app.models.question_bank import QuestionBank, QualityStatusEnum
from app.models.session import Session as SessionModel, SessionModeEnum, SessionStatusEnum
from app.models.skill import Skill, UserSkillState, SectionEnum, DomainEnum
from app.services.question_generation import generate_question
from app.services.question_service import get_or_create_question, get_excluded_question_ids_for_user

DIFFICULTY_MIN = 1
DIFFICULTY_MAX = 5
TARGETED_MIN = 10
TARGETED_MAX = 20


def _lowest_mastery_skill_id(
    db: Session, user_id: UUID, section: SectionEnum, domain: DomainEnum | None
) -> UUID | None:
    q = (
        db.query(Skill.id)
        .join(UserSkillState, (UserSkillState.skill_id == Skill.id) & (UserSkillState.user_id == user_id))
        .filter(Skill.section == section)
        .order_by(UserSkillState.mastery_score.asc(), Skill.id)
    )
    if domain is not None:
        q = q.filter(Skill.domain == domain)
    row = q.first()
    return row[0] if row else None


def _parse_domain(domain: str | None) -> DomainEnum | None:
    if not domain:
        return None
    try:
        return DomainEnum(domain)
    except ValueError:
        return None


def start_practice(
    db: Session,
    user_id: UUID,
    section: SectionEnum,
    domain: str | None = None,
) -> SessionModel:
    """Start practice session. No baseline gate. Picks lowest mastery skill in section (optional domain). Raises ValueError if user not found."""
    from app.services.user_service import get_user_by_id
    if get_user_by_id(db, user_id) is None:
        raise ValueError("USER_NOT_FOUND")
    domain_enum = _parse_domain(domain)
    skill_id = _lowest_mastery_skill_id(db, user_id, section, domain_enum)
    if not skill_id:
        raise ValueError("No skills found for this section" + (" and domain" if domain else ""))
    session = SessionModel(
        user_id=user_id,
        mode=SessionModeEnum.PRACTICE,
        status=SessionStatusEnum.ACTIVE,
        current_section=section,
        practice_domain=domain,
        current_practice_skill_id=skill_id,
        current_practice_difficulty=DIFFICULTY_MIN,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def start_targeted_practice(
    db: Session,
    user_id: UUID,
    topic: str,
    min_questions: int = TARGETED_MIN,
    max_questions: int = TARGETED_MAX,
) -> SessionModel:
    """Start targeted practice for a topic: preselect 10-20 questions, store in practice_blueprint_json. No repeats in session. Raises ValueError if user not found."""
    from app.services.user_service import get_user_by_id
    if get_user_by_id(db, user_id) is None:
        raise ValueError("USER_NOT_FOUND")
    skills = db.query(Skill).filter(Skill.topic == topic).all()
    if not skills:
        skills = db.query(Skill).filter(Skill.name == topic).all()
    if not skills:
        raise ValueError(f"No skills found for topic: {topic}")
    skill_ids = [s.id for s in skills]
    excluded = get_excluded_question_ids_for_user(db, user_id, 100)
    questions = (
        db.query(QuestionBank)
        .filter(
            QuestionBank.skill_id.in_(skill_ids),
            QuestionBank.quality_status.in_([QualityStatusEnum.APPROVED, QualityStatusEnum.DRAFT]),
            QuestionBank.id.notin_(excluded) if excluded else True,
        )
        .limit(max_questions * 2)
        .all()
    )
    random.shuffle(questions)
    question_ids = [str(q.id) for q in questions[:max_questions]]
    if len(question_ids) < min_questions:
        raise ValueError(f"Not enough questions for topic {topic} (found {len(question_ids)}, need at least {min_questions})")
    section = skills[0].section
    session = SessionModel(
        user_id=user_id,
        mode=SessionModeEnum.PRACTICE,
        status=SessionStatusEnum.ACTIVE,
        current_section=section,
        practice_domain=None,
        current_practice_skill_id=skills[0].id,
        current_practice_difficulty=DIFFICULTY_MIN,
        practice_blueprint_json=question_ids,
        practice_topic=topic,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_next_question(db: Session, session_id: UUID, user_id: UUID) -> QuestionBank | None:
    """Return next question. If session has practice_blueprint_json, serve from that list (no repeat in session). Else cache-first adaptive."""
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == user_id,
        SessionModel.mode == SessionModeEnum.PRACTICE,
        SessionModel.status == SessionStatusEnum.ACTIVE,
    ).first()
    if not session:
        return None
    blueprint = session.practice_blueprint_json
    if blueprint:
        attempted = {a.question_id for a in db.query(Attempt).filter(Attempt.session_id == session_id).all()}
        for qid_str in blueprint:
            try:
                qid = UUID(qid_str)
            except (ValueError, TypeError):
                continue
            if qid not in attempted:
                q = db.query(QuestionBank).filter(QuestionBank.id == qid).first()
                if q:
                    return q
        return None
    skill_id = session.current_practice_skill_id
    difficulty = session.current_practice_difficulty or DIFFICULTY_MIN
    if not skill_id or not session.current_section:
        return None
    section = session.current_section

    def gen(sess, sid, diff):
        return generate_question(sess, sid, diff)

    q = get_or_create_question(
        db, gen,
        section=section,
        skill_id=skill_id,
        difficulty=difficulty,
        user_id=user_id,
    )
    return q


def submit_answer(
    db: Session,
    session_id: UUID,
    user_id: UUID,
    question_id: UUID,
    user_answer: str,
    time_taken_sec: int | None = None,
) -> dict:
    """Record attempt, update mastery and last_seen_at, return is_correct, correct_answer, explanation."""
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == user_id,
        SessionModel.mode == SessionModeEnum.PRACTICE,
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

    # Topic summary for analytics (targeted practice)
    if session.practice_topic:
        _record_topic_summary(db, user_id, session_id, session.practice_topic, correct)

    # Update mastery for this skill (practice only)
    skill_id = question.skill_id
    state = db.query(UserSkillState).filter(
        UserSkillState.user_id == user_id,
        UserSkillState.skill_id == skill_id,
    ).first()
    if state:
        state.mastery_score = max(0, state.mastery_score + (1 if correct else -1))
        state.last_seen_at = datetime.utcnow()

    # Update session difficulty from last 2 attempts in this session
    attempts = (
        db.query(Attempt)
        .filter(Attempt.session_id == session_id)
        .order_by(Attempt.created_at.desc())
        .limit(2)
        .all()
    )
    if len(attempts) >= 2:
        a1, a2 = attempts[0], attempts[1]
        cur = session.current_practice_difficulty or DIFFICULTY_MIN
        if a1.is_correct and a2.is_correct:
            session.current_practice_difficulty = min(DIFFICULTY_MAX, cur + 1)
        elif not a1.is_correct and not a2.is_correct:
            session.current_practice_difficulty = max(DIFFICULTY_MIN, cur - 1)

    db.commit()
    return {
        "is_correct": correct,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation or "",
    }


def end_practice(db: Session, session_id: UUID, user_id: UUID) -> None:
    """Mark session as ENDED."""
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == user_id,
        SessionModel.mode == SessionModeEnum.PRACTICE,
    ).first()
    if not session:
        raise ValueError("Session not found")
    session.status = SessionStatusEnum.ENDED
    session.ended_at = datetime.utcnow()
    db.commit()


def _record_topic_summary(
    db: Session, user_id: UUID, session_id: UUID, topic: str, is_correct: bool
) -> None:
    """Upsert practice_topic_summary for today (by user_id, topic, summary_date)."""
    today = date.today()
    row = (
        db.query(PracticeTopicSummary)
        .filter(
            PracticeTopicSummary.user_id == user_id,
            PracticeTopicSummary.topic == topic,
            PracticeTopicSummary.summary_date == today,
        )
        .first()
    )
    if row:
        row.questions_answered += 1
        if is_correct:
            row.correct_count += 1
    else:
        row = PracticeTopicSummary(
            user_id=user_id,
            topic=topic,
            session_id=session_id,
            summary_date=today,
            questions_answered=1,
            correct_count=1 if is_correct else 0,
            created_at=datetime.utcnow(),
        )
        db.add(row)


def update_mastery_from_exam_result(db: Session, user_id: UUID, domain_breakdown_json: dict) -> None:
    """Update user_skill_state mastery from full exam result domain_breakdown_json. Keys = skill_id (str), values = score."""
    for skill_id_str, score in domain_breakdown_json.items():
        try:
            skill_id = UUID(skill_id_str)
        except (ValueError, TypeError):
            continue
        state = db.query(UserSkillState).filter(
            UserSkillState.user_id == user_id,
            UserSkillState.skill_id == skill_id,
        ).first()
        if state:
            state.mastery_score = int(score) if isinstance(score, (int, float)) else 0
    db.commit()
