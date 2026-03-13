# Runbook — Common issues and fixes

## DB connection

**Symptom:** `connection refused`, `could not connect to server`, or `FATAL: database "adaptive_sat" does not exist`.

**Fix:**
1. Ensure PostgreSQL is running (e.g. `pg_isready -h localhost`).
2. Create the database: `psql -U postgres -c "CREATE DATABASE adaptive_sat;"`
3. Set `DATABASE_URL` in `.env` to a valid connection string, e.g.  
   `postgresql://USER:PASSWORD@localhost:5432/adaptive_sat`
4. If using a different host/port, update `DATABASE_URL` accordingly.

## Migrations

**Symptom:** `alembic upgrade head` fails with "relation does not exist" or "column already exists".

**Fix:**
1. Ensure you're in the `backend/` directory and `DATABASE_URL` is set.
2. For a clean install: run `alembic upgrade head` once. If it fails partway, check the error: sometimes a manual fix in the DB or a new migration is needed.
3. If you've edited migrations after running them, avoid editing existing migration files; add a new migration instead.
4. To reset (destroys data): `alembic downgrade base` then `alembic upgrade head`.

## OpenAI failures

**Symptom:** Question generation fails with API errors, rate limits, or timeouts.

**Fix:**
1. Set `OPENAI_API_KEY` in `.env` to a valid key.
2. The app rate-limits OpenAI calls in-memory (default 20/minute). If you hit provider rate limits, reduce usage or add a longer delay in `app/utils/rate_limit.py` (e.g. lower `OPENAI_CALLS_PER_MINUTE`).
3. For "invalid JSON" or "judge did not pass": the service retries (JSON up to 2 retries, judge up to 2 regens). If it still fails, check prompt files in `app/prompts/` and model availability (GPT-4o mini for generation, GPT-4o for judge on difficulty 4–5).

## Admin endpoints return 403

**Symptom:** `GET /api/admin/questions` or similar returns 403.

**Fix:** All `/api/admin/*` routes require header `X-ADMIN-KEY` matching `ADMIN_KEY` in `.env`. Set `ADMIN_KEY` in `.env` and send the same value in the request header: `X-ADMIN-KEY: your-secret-admin-key`.

## Exam / practice "No questions" or empty

**Symptom:** Exam or practice returns no question or "No skills found".

**Fix:**
1. Run seed: `python -m app.scripts.seed_skills` so that skills exist.
2. For practice by section, user must have `user_skill_state` rows (created when user is created). Ensure the user was created via `POST /api/users`.
3. **Exams prefer APPROVED then DRAFT; all questions are validated.** If the bank has no valid questions (no placeholders, min lengths), start exam can fail. Add or generate questions; generation validates before storing. Practice can use DRAFT + generation as before.

## Request ID and logs

Every request gets an `X-Request-ID` response header and a log line with `request_id=...`. Use this to correlate errors with specific requests in logs.
