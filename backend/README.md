# Adaptive SAT — Backend

FastAPI app. PostgreSQL + SQLAlchemy 2.0 + Alembic. OpenAI for question generation and judging.

## Setup

1. Python 3.11+
2. Create venv: `python -m venv .venv` then activate.
3. Install: `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and set variables (see **Environment variables** below).
5. Create DB and run migrations: see `sql/SETUP_DATABASE.md`, then `alembic upgrade head`.
6. Seed skills: `python -m app.scripts.seed_skills`
7. Optional: backfill skill topics: `python -m app.scripts.backfill_skill_topics`

## Run

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/adaptive_sat` |
| `OPENAI_API_KEY` | For generation | OpenAI API key; needed for question generation and judge (difficulty 4–5) |
| `ADMIN_KEY` | For admin | Secret key; send as header `X-ADMIN-KEY` for `/api/admin/*` endpoints |
| `EXAM_ROUTE_THRESHOLD` | No | M1 accuracy threshold for routing to HARD M2 (default `0.65`) |
| `EXAM_FIRST_EXAM_NO_REPEAT_UNTIL_SESSIONS` | No | For the first this-many exams, no question is repeated across those exams (default `20`); after that, repeats are allowed |

## API endpoints

All API routes are under `/api`. Responses use consistent error shape: `{ "code": "...", "message": "..." }` where applicable.

### Health
- **GET /api/health** — Returns `{ "status": "ok" }`.

### Users
- **POST /api/users** — Create user (body: `name`, `email`). Initializes `user_skill_state` for all skills with mastery 0.
- **GET /api/users/{user_id}** — Get user by ID.

### Questions
- **POST /api/questions/request** — Request a question (cache-first, generate on miss). Body: `user_id`, `skill_id`, `section` (RW|MATH), `difficulty` (1–5).

### Practice
- **POST /api/practice/start** — Start practice session. Body: `user_id`, `section`, optional `domain`.
- **POST /api/practice/next** — Get next question. Body: `session_id`, `user_id`.
- **POST /api/practice/answer** — Submit answer. Body: `session_id`, `question_id`, `user_answer`, optional `time_taken_sec`. Returns `is_correct`, `correct_answer`, `explanation`.
- **POST /api/practice/end** — End session. Body: `session_id`.
- **POST /api/practice/targeted/start** — Start targeted practice by topic (10–20 questions). Body: `user_id`, `topic`, optional `min_questions`, `max_questions`.

### Exam
- **POST /api/exam/start** — Start full Digital SAT exam. Body: `user_id`. Builds RW Module 1 blueprint.
- **GET /api/exam/time_remaining** — Query: `session_id`, `user_id`. Returns `seconds_remaining`, `expired`.
- **POST /api/exam/next** — Next question in current module. Body: `session_id`. Returns 409 `MODULE_TIME_EXPIRED` when module time is up.
- **POST /api/exam/answer** — Submit answer. Body: `session_id`, `question_id`, `user_answer`, optional `time_taken_sec`. Returns 409 when time expired.
- **POST /api/exam/advance** — Advance to next module or end exam. Body: `session_id`.
- **GET /api/exam/result** — Query: `session_id`, `user_id`. Returns scaled scores and domain breakdown.
- **GET /api/exam/weak_areas** — Query: `user_id`, optional `top_n` (default 5). Returns weakest skills from latest exam.

### Progress
- **GET /api/progress/skills** — Query: `user_id`. Returns list of `{ skill_name, section, mastery_score }`.

### Analytics
- **GET /api/analytics/topic_accuracy** — Query: `user_id`, optional `topic`, `days` (default 30). Topic accuracy over time.
- **GET /api/analytics/practice_vs_exam** — Query: `user_id`. Practice by topic vs latest exam.

### Admin (require header `X-ADMIN-KEY`)

- **GET /api/admin/questions** — List questions. Query: `status` (DRAFT|APPROVED|REJECTED), `id_prefix` (UUID prefix search), `skip`, `limit`.
- **GET /api/admin/questions/{question_id}** — Question detail.
- **POST /api/admin/questions/{question_id}/approve** — Set status to APPROVED.
- **POST /api/admin/questions/{question_id}/reject** — Set status to REJECTED.
- **GET /api/admin/questions/{question_id}/stats** — Times used, correct rate, avg time taken.

## Layout

- `app/main.py` — FastAPI app, middleware (request_id, logging), exception handlers
- `app/core/config.py` — Pydantic settings, exam constants
- `app/db/` — session, base model
- `app/models/` — SQLAlchemy models
- `app/schemas/` — Pydantic schemas
- `app/api/` — routes, deps, error_handlers, middleware
- `app/services/` — business logic (exam, practice, question, user, analytics)
- `app/scripts/` — seed, backfill
- `app/prompts/` — OpenAI prompts
- `app/utils/` — prompt loader, rate limit (OpenAI)

## Tests

```bash
# No DB required
pytest tests/test_question_validation.py tests/test_api_health.py -v

# With PostgreSQL (set DATABASE_URL)
pytest tests/ -v
```

See **docs/RUNBOOK.md** for common issues and runbook.
