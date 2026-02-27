"""Test question LLM output validation."""
import pytest
from pydantic import ValidationError

from app.schemas.question import QuestionLLMOutput


def test_valid_output():
    data = {
        "question_text": "x" * 40,
        "choices": {"A": "opt1", "B": "opt2", "C": "opt3", "D": "opt4"},
        "correct_answer": "B",
        "explanation": "x" * 60,
    }
    out = QuestionLLMOutput.model_validate(data)
    assert out.correct_answer == "B"
    assert out.question_text == "x" * 40
    assert set(out.choices.keys()) == {"A", "B", "C", "D"}


def test_correct_answer_must_be_a_b_c_d():
    data = {
        "question_text": "x" * 40,
        "choices": {"A": "a", "B": "b", "C": "c", "D": "d"},
        "correct_answer": "E",
        "explanation": "x" * 60,
    }
    with pytest.raises(ValidationError):
        QuestionLLMOutput.model_validate(data)


def test_question_text_min_length():
    data = {
        "question_text": "short",
        "choices": {"A": "a", "B": "b", "C": "c", "D": "d"},
        "correct_answer": "A",
        "explanation": "x" * 60,
    }
    with pytest.raises(ValidationError):
        QuestionLLMOutput.model_validate(data)


def test_explanation_min_length():
    data = {
        "question_text": "x" * 40,
        "choices": {"A": "a", "B": "b", "C": "c", "D": "d"},
        "correct_answer": "A",
        "explanation": "short",
    }
    with pytest.raises(ValidationError):
        QuestionLLMOutput.model_validate(data)


def test_choices_no_duplicates():
    data = {
        "question_text": "x" * 40,
        "choices": {"A": "same", "B": "same", "C": "c", "D": "d"},
        "correct_answer": "A",
        "explanation": "x" * 60,
    }
    with pytest.raises(ValidationError):
        QuestionLLMOutput.model_validate(data)


def test_choices_min_length():
    data = {
        "question_text": "x" * 40,
        "choices": {"A": "ab", "B": "b", "C": "c", "D": "d"},  # A only 2 chars
        "correct_answer": "A",
        "explanation": "x" * 60,
    }
    with pytest.raises(ValidationError):
        QuestionLLMOutput.model_validate(data)
