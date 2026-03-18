"""Generate question via OpenAI, validate, optionally judge (difficulty 4-5), store as DRAFT."""
import json
import random
import re
from uuid import UUID

ORDER_KEYS = ["A", "B", "C", "D"]


def _rewrite_explanation_for_shuffled_choices(explanation: str, old_correct: str, new_correct: str) -> str:
    """Replace references to the old correct letter (before shuffle) with the new letter in the explanation.
    Only touches common answer-reference patterns so we don't change unrelated uses of the letter."""
    if not explanation or not old_correct or not new_correct or old_correct.upper() == new_correct.upper():
        return explanation or ""
    old_letter = old_correct.strip().upper()
    new_letter = new_correct.strip().upper()
    text = explanation
    # Replace in common patterns (case-insensitive) so "correct answer is B" -> "correct answer is A"
    patterns = [
        (r"(correct\s+answer\s+is\s+)" + re.escape(old_letter) + r"(\s|\.|,|$)", r"\g<1>" + new_letter + r"\g<2>"),
        (r"(the\s+answer\s+is\s+)" + re.escape(old_letter) + r"(\s|\.|,|$)", r"\g<1>" + new_letter + r"\g<2>"),
        (r"(answer\s+is\s+)" + re.escape(old_letter) + r"(\s|\.|,|$)", r"\g<1>" + new_letter + r"\g<2>"),
        (r"(Choice\s+)" + re.escape(old_letter) + r"(\s|\.|,|\)|$)", r"\g<1>" + new_letter + r"\g<2>"),
        (r"(Option\s+)" + re.escape(old_letter) + r"(\s|\.|,|\)|$)", r"\g<1>" + new_letter + r"\g<2>"),
        (r"(\s+)" + re.escape(old_letter) + r"(\s+is\s+correct)", r"\g<1>" + new_letter + r"\g<2>"),
    ]
    for pattern, repl in patterns:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text


def _normalize_explanation_to_stored_answer(explanation: str, stored_correct: str) -> str:
    """Replace any stated answer letter in common phrases with stored_correct. Use for fixing existing DB rows."""
    if not explanation or not stored_correct:
        return explanation or ""
    new_letter = stored_correct.strip().upper()
    text = explanation
    for letter in ORDER_KEYS:
        if letter == new_letter:
            continue
        patterns = [
            (
                r"(correct\s+answer\s+is\s+|the\s+answer\s+is\s+|answer\s+is\s+|Choice\s+|Option\s+)"
                + re.escape(letter)
                + r"(\s|\.|,|\)|$)",
                r"\g<1>" + new_letter + r"\g<2>",
            ),
            (r"(\s+)" + re.escape(letter) + r"(\s+is\s+correct)", r"\g<1>" + new_letter + r"\g<2>"),
            (r"^(\s*)" + re.escape(letter) + r"(\s+is\s+correct)", r"\g<1>" + new_letter + r"\g<2>"),
        ]
        for pattern, repl in patterns:
            text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text


from openai import OpenAI
from sqlalchemy import func
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
MAX_JSON_RETRIES = 4
# Base judge retries; difficulty 5 may get more (see below).
MAX_JUDGE_RETRIES = 2
MAX_NOVELTY_RETRIES = 3  # retry generation if question_text already exists for this skill
MAX_AVOID_SAMPLES = 8    # max existing question texts to show in prompt so LLM generates something different


def _extract_json(text: str) -> dict | None:
    """Try to parse JSON from model output (strip markdown, find JSON object)."""
    text = (text or "").strip()
    # Remove optional markdown code block
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1).strip()
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try to find a JSON object: first { to last }
    start = text.find("{")
    if start >= 0:
        end = text.rfind("}")
        if end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
    return None


def _get_existing_question_texts(db: Session, skill_id: UUID, limit: int = MAX_AVOID_SAMPLES) -> list[str]:
    """Return trimmed question_text for this skill so the generator can avoid duplicating them."""
    rows = (
        db.query(QuestionBank.question_text)
        .filter(QuestionBank.skill_id == skill_id)
        .limit(limit * 2)
        .all()
    )
    seen: set[str] = set()
    out: list[str] = []
    for (text,) in rows:
        t = (text or "").strip()
        if t and t not in seen and len(t) >= 20:
            seen.add(t)
            out.append(t[:250])
            if len(out) >= limit:
                break
    return out


def _generate_raw(
    client: OpenAI,
    section: SectionEnum,
    skill_name: str,
    difficulty: int,
    avoid_question_texts: list[str] | None = None,
    judge_feedback: str | None = None,
) -> str:
    wait_if_needed()
    if section == SectionEnum.MATH:
        tpl = load_prompt("sat_math_question_v1.txt")
    else:
        tpl = load_prompt("sat_rw_question_v1.txt")
    prompt = tpl.replace("{{skill_name}}", skill_name).replace("{{difficulty}}", str(difficulty))
    if avoid_question_texts:
        avoid_block = (
            "\n\n## Important – novelty and diversity\n"
            "Do NOT create a question that has the same or nearly the same wording as any of the existing questions below. "
            "Also avoid creating the same type of problem or scenario (e.g. if you see a 'store sells pencils/erasers' or "
            "'solve 2x + 3 = 11' style question, create something with a different context, different numbers, or a different "
            "problem structure—not just a rephrase). Your question must be distinct in both wording and scenario/problem type.\n\n"
            "Existing questions to avoid (wording and scenario):\n"
            + "\n".join(f"- {t}" for t in avoid_question_texts[:MAX_AVOID_SAMPLES])
        )
        prompt = prompt + avoid_block
    if judge_feedback:
        prompt = prompt + judge_feedback
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

    # Get existing question texts for this skill so we can ask the LLM to generate something different
    avoid_texts = _get_existing_question_texts(db, skill_id)
    parsed: QuestionLLMOutput | None = None
    last_raw: str | None = None
    existing_same_text: QuestionBank | None = None

    for novelty_attempt in range(MAX_NOVELTY_RETRIES):
        parsed = None
        last_raw = None
        for _ in range(MAX_JSON_RETRIES + 1):
            raw = _generate_raw(client, section, skill_name, difficulty, avoid_question_texts=avoid_texts)
            last_raw = raw
            data = _extract_json(raw)
            if not data:
                continue
            if "choices" in data and isinstance(data["choices"], dict):
                choices = data["choices"]
                if set(choices.keys()) != {"A", "B", "C", "D"} and set(k.upper() for k in choices.keys()) == {"A", "B", "C", "D"}:
                    data["choices"] = {k.upper(): (v or "").strip() for k, v in choices.items()}
            if data.get("correct_answer"):
                data["correct_answer"] = (data["correct_answer"] or "").strip().upper()
            try:
                parsed = QuestionLLMOutput(
                    question_text=data["question_text"],
                    choices=data["choices"],
                    correct_answer=data["correct_answer"],
                    explanation=data.get("explanation", ""),
                )
                # Validate minimum exam-quality constraints early so we don't waste judge retries
                # on items that would later fail (e.g. choices shorter than 5 chars).
                validation_errors = validate_question_content(
                    parsed.question_text,
                    parsed.choices,
                    parsed.correct_answer,
                    parsed.explanation or "",
                )
                if validation_errors:
                    parsed = None
                    continue
                break
            except Exception:
                continue
        if not parsed:
            err_msg = "Could not produce valid question JSON after retries"
            if last_raw:
                err_msg += f". Last raw response (first 500 chars): {last_raw[:500]!r}"
            raise ValueError(err_msg)

        # Judge for difficulty 4-5
        if difficulty >= 4:
            question_dict = {
                "question_text": parsed.question_text,
                "choices": parsed.choices,
                "correct_answer": parsed.correct_answer,
                "explanation": parsed.explanation,
            }
            # Allow extra judge-driven retries for the hardest items.
            judge_retries = MAX_JUDGE_RETRIES + (2 if difficulty == 5 else 0)
            last_issues: str | None = None
            for _ in range(judge_retries + 1):
                ok, issues = _judge(client, question_dict, difficulty)
                last_issues = issues
                if ok:
                    break
                # If judge says it's too easy or has a specific flaw, feed that back into the next generation.
                feedback = f"\n\nThe previous attempt was rejected for this reason: {issues}. Regenerate a question that fixes this issue while still following all original instructions."
                raw = _generate_raw(client, section, skill_name, difficulty, avoid_question_texts=avoid_texts, judge_feedback=feedback)
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
                    question_dict = {
                        "question_text": parsed.question_text,
                        "choices": parsed.choices,
                        "correct_answer": parsed.correct_answer,
                        "explanation": parsed.explanation,
                    }
                except Exception:
                    continue
            if not ok:
                raise ValueError(f"Judge did not pass after retries: {last_issues}")

        # Check if this question_text already exists for this skill — if so, retry with it in the avoid list
        normalized_text = (parsed.question_text or "").strip()
        if not normalized_text:
            break
        existing_same_text = db.query(QuestionBank).filter(
            QuestionBank.section == section,
            QuestionBank.skill_id == skill_id,
            func.trim(QuestionBank.question_text) == normalized_text,
        ).first()
        if not existing_same_text:
            break
        # Duplicate: add to avoid list and retry so the next generation is different
        avoid_texts = (avoid_texts + [normalized_text[:250]])[-MAX_AVOID_SAMPLES:]

    # If we still have a duplicate after all novelty retries, return existing so the request succeeds
    if existing_same_text is not None:
        return existing_same_text

    # Shuffle choice order so correct answer isn't biased toward A (LLMs often put it first)
    choices_dict = parsed.to_choices_json() if hasattr(parsed, "to_choices_json") else parsed.choices
    shuffled_order = ORDER_KEYS.copy()
    random.shuffle(shuffled_order)
    shuffled_choices = {ORDER_KEYS[i]: choices_dict[shuffled_order[i]] for i in range(4)}
    # New correct letter is the one that now holds the text that was correct
    correct_text = choices_dict[parsed.correct_answer]
    shuffled_correct = next(k for k in ORDER_KEYS if shuffled_choices[k] == correct_text)

    # Validate before storing so we never save placeholders or low-quality content
    validation_errors = validate_question_content(
        parsed.question_text,
        shuffled_choices,
        shuffled_correct,
        parsed.explanation or "",
    )
    if validation_errors:
        raise ValueError("Question failed validation: " + "; ".join(validation_errors))

    # Rewrite explanation so it references the new correct letter after shuffle (not the pre-shuffle letter)
    explanation_for_db = _rewrite_explanation_for_shuffled_choices(
        parsed.explanation or "", parsed.correct_answer, shuffled_correct
    )

    q = QuestionBank(
        section=section,
        skill_id=skill_id,
        difficulty_llm=difficulty,
        question_text=parsed.question_text,
        choices_json=shuffled_choices,
        correct_answer=shuffled_correct,
        explanation=explanation_for_db,
        quality_status=QualityStatusEnum.DRAFT,
        source_model=GENERATION_MODEL,
        prompt_version=PROMPT_VERSION,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q
