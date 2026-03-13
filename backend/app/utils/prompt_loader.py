"""Load prompt templates from app/prompts."""
import os

# This file lives in app/utils/, so go up one level to app/ and then into prompts/
PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def load_prompt(name: str) -> str:
    path = os.path.join(PROMPTS_DIR, name)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()
