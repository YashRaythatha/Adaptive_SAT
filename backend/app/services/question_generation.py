"""Generate question via OpenAI, validate, optionally judge (difficulty 4-5), store as DRAFT."""
import json
import re
from uuid import UUID

from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.question_bank import QuestionBank, QualityStatusEnum
from app.models.skill import Skill, SectionEnum
from app.schemas.question import QuestionLLMOutput
from app.services.question_service import validate_question_content
from app.utils.prompt_loader import load_prompt
from app.utils.rate_limit import wait_if_needed

GENERATION_MODEL = "gpt-4o-mini"
JUDGE_MODEL = "gpt-4o"
PROMPT_VERSION = "v1"
MAX_JSON_RETRIES = 2
MAX_JUDGE_RETRIES = 2


def _extract_json(text: str) -> dict | None:
    """Try to parse JSON from model output (strip markdown if present)."""
    text = text.strip()
    # Remove optional markdown code block
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _generate_raw(client: OpenAI, section: SectionEnum, skill_name: str, difficulty: int) -> str:
    wait_if_needed()
    if section == SectionEnum.MATH:
        tpl = load_prompt("sat_math_question_v1.txt")
    else:
        tpl = load_prompt("sat_rw_question_v1.txt")
    prompt = tpl.replace("{{skill_name}}", skill_name).replace("{{difficulty}}", str(difficulty))
    r = client.chat.completions.create(
        model=GENERATION_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    return (r.choices[0].message.content or "").strip()


def _judge(client: OpenAI, question_json: dict, requested_difficulty: int) -> tuple[bool, str]:
    wait_if_needed()
    judge_tpl = load_prompt("judge_v1.txt")
    content = judge_tpl.replace("{{question_json}}", json.dumps(question_json)).replace(
        "{{requested_difficulty}}", str(requested_difficulty)
    )
    r = client.chat.completions.create(
        model=JUDGE_MODEL,
        messages=[{"role": "user", "content": content}],
        temperature=0,
    )
    text = (r.choices[0].message.content or "").strip()
    data = _extract_json(text)
    if not data:
        return False, "Judge response was not valid JSON"
    single = data.get("single_correct", False)
    consistent = data.get("explanation_consistent", False)
    matches = data.get("difficulty_matches", False)
    issues = data.get("issues", "")
    ok = single and consistent and matches
    return ok, issues or ("Judge did not pass" if not ok else "")


def generate_question(
    db: Session,
    skill_id: UUID,
    difficulty: int,
) -> QuestionBank:
    """Generate one question for the skill/difficulty, validate, judge if 4-5, store as DRAFT."""
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    client = OpenAI(api_key=settings.openai_api_key)
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise ValueError("Skill not found")
    section = skill.section
    skill_name = skill.name

    parsed: QuestionLLMOutput | None = None
    for _ in range(MAX_JSON_RETRIES + 1):
        raw = _generate_raw(client, section, skill_name, difficulty)
        data = _extract_json(raw)
        if not data:
            continue
        try:
            parsed = QuestionLLMOutput(
                question_text=data["question_text"],
                choices=data["choices"],
                correct_answer=data["correct_answer"],
                explanation=data.get("explanation", ""),
            )
            break
        except Exception:
            continue
    if not parsed:
        raise ValueError("Could not produce valid question JSON after retries")

    # Judge for difficulty 4-5
    if difficulty >= 4:
        question_dict = {
            "question_text": parsed.question_text,
            "choices": parsed.choices,
            "correct_answer": parsed.correct_answer,
            "explanation": parsed.explanation,
        }
        for _ in range(MAX_JUDGE_RETRIES + 1):
            ok, issues = _judge(client, question_dict, difficulty)
            if ok:
                break
            # Regen on judge fail
            raw = _generate_raw(client, section, skill_name, difficulty)
            data = _extract_json(raw)
            if data:
                try:
                    parsed = QuestionLLMOutput(
                        question_text=data["question_text"],
                        choices=data["choices"],
                        correct_answer=data["correct_answer"],
                        explanation=data.get("explanation", ""),
                    )
                    question_dict = {
                        "question_text": parsed.question_text,
                        "choices": parsed.choices,
                        "correct_answer": parsed.correct_answer,
                        "explanation": parsed.explanation,
                    }
                    ok, issues = _judge(client, question_dict, difficulty)
                    if ok:
                        break
                except Exception:
                    pass
        if not ok:
            raise ValueError(f"Judge did not pass after retries: {issues}")

    # Validate before storing so we never save placeholders or low-quality content
    choices_dict = parsed.to_choices_json() if hasattr(parsed, "to_choices_json") else parsed.choices
    validation_errors = validate_question_content(
        parsed.question_text,
        choices_dict,
        parsed.correct_answer,
        parsed.explanation or "",
    )
    if validation_errors:
        raise ValueError("Question failed validation: " + "; ".join(validation_errors))

    q = QuestionBank(
        section=section,
        skill_id=skill_id,
        difficulty_llm=difficulty,
        question_text=parsed.question_text,
        choices_json=parsed.to_choices_json(),
        correct_answer=parsed.correct_answer,
        explanation=parsed.explanation,
        quality_status=QualityStatusEnum.DRAFT,
        source_model=GENERATION_MODEL,
        prompt_version=PROMPT_VERSION,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q
