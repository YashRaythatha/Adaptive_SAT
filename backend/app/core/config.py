"""App config via pydantic-settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://localhost:5432/adaptive_sat"
    admin_key: str | None = None
    openai_api_key: str | None = None

    # Exam routing: M1 accuracy >= this => HARD module 2, else EASY
    exam_route_threshold: float = 0.65
    # No-repeat: for the first this-many exams, no question can appear twice; after that, repeats allowed
    exam_first_exam_no_repeat_until_sessions: int = 20


settings = Settings()

# Digital SAT module structure: (num_questions, time_limit_sec)
EXAM_MODULE_SPEC = {
    ("RW", 1): (27, 32 * 60),
    ("RW", 2): (27, 32 * 60),
    ("MATH", 1): (22, 35 * 60),
    ("MATH", 2): (22, 35 * 60),
}
# Module 1 difficulty distribution: 20% diff 2, 60% diff 3, 20% diff 4
EXAM_M1_DIFFICULTY_DISTRIBUTION = [(2, 0.20), (3, 0.60), (4, 0.20)]
# EASY band (M2 after low M1 accuracy): 70% diff 1-2, 30% diff 3
EXAM_M2_EASY_DISTRIBUTION = [(1, 0.35), (2, 0.35), (3, 0.30)]
# HARD band (M2 after high M1 accuracy): 70% diff 4-5, 30% diff 3
EXAM_M2_HARD_DISTRIBUTION = [(4, 0.35), (5, 0.35), (3, 0.30)]
# Domain weights for blueprint (CORE, ADVANCED, OTHER) - interleave by these
EXAM_DOMAIN_WEIGHTS = {"CORE": 0.65, "ADVANCED": 0.25, "OTHER": 0.10}
