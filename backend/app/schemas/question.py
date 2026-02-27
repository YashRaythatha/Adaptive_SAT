"""Question LLM output contract and validation."""
from pydantic import BaseModel, field_validator

VALID_KEYS = {"A", "B", "C", "D"}
MIN_QUESTION_LEN = 40
MIN_CHOICE_LEN = 3
MIN_EXPLANATION_LEN = 60


class QuestionLLMOutput(BaseModel):
    """Strict contract from LLM: JSON with question_text, choices A-D, correct_answer, explanation."""
    question_text: str
    choices: dict[str, str]  # {"A":"...","B":"...","C":"...","D":"..."}
    correct_answer: str
    explanation: str

    @field_validator("choices")
    @classmethod
    def choices_exactly_four(cls, v: dict[str, str]) -> dict[str, str]:
        if set(v.keys()) != VALID_KEYS:
            raise ValueError("choices must have exactly keys A, B, C, D")
        for k in VALID_KEYS:
            s = (v.get(k) or "").strip()
            if len(s) < MIN_CHOICE_LEN:
                raise ValueError(f"choice {k} must be at least {MIN_CHOICE_LEN} characters")
            if not s:
                raise ValueError("no empty strings for choices")
        # reject duplicate choice text
        vals = [v[k].strip() for k in VALID_KEYS]
        if len(vals) != len(set(vals)):
            raise ValueError("duplicate choice text not allowed")
        return v

    @field_validator("correct_answer")
    @classmethod
    def correct_in_choices(cls, v: str, info):
        v = (v or "").strip().upper()
        if v not in VALID_KEYS:
            raise ValueError("correct_answer must be one of A, B, C, D")
        return v

    @field_validator("question_text")
    @classmethod
    def question_min_length(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < MIN_QUESTION_LEN:
            raise ValueError(f"question_text must be at least {MIN_QUESTION_LEN} characters")
        return v

    @field_validator("explanation")
    @classmethod
    def explanation_min_length(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < MIN_EXPLANATION_LEN:
            raise ValueError(f"explanation must be at least {MIN_EXPLANATION_LEN} characters")
        return v

    def to_choices_json(self) -> dict:
        """Format for DB choices_json (A-D keys)."""
        return {k: self.choices[k].strip() for k in VALID_KEYS}
