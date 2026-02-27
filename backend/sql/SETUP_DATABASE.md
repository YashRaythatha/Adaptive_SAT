# Database setup

PostgreSQL is required. No Docker; run Postgres locally.

## 1. Create database

**Option A — pgAdmin (Windows):**  
1. Open pgAdmin and connect to your server.  
2. Right-click **Databases** → **Create** → **Database**.  
3. Name: `adaptive_sat`, then click **Save**.

**Option B — psql (if in PATH):**

```bash
psql -U postgres -c "CREATE DATABASE adaptive_sat;"
```

**Option C — Windows: PostgreSQL SQL Shell (psql):**  
1. Start **SQL Shell (psql)** from the Start menu.  
2. Accept defaults (server, port, database) or enter your postgres user.  
3. At the `postgres=#` prompt run:

```sql
CREATE DATABASE adaptive_sat;
```

## 2. Configure connection

Edit `backend/.env` and set `DATABASE_URL` with your PostgreSQL username and password:

```
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/adaptive_sat
```

**If your password contains special characters** (e.g. `@`, `#`, `%`), URL-encode them in the URL:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`

Example: password `Admin@123` → use `Admin%40123` in the URL.

Example: if your user is `postgres` and password is `mypass`:

```
DATABASE_URL=postgresql://postgres:mypass@localhost:5432/adaptive_sat
```

## 3. Run migrations

From the `backend/` directory:

```bash
alembic upgrade head
```

## 4. Seed data

```bash
python -m app.scripts.seed_skills
```

Optional backfill for skill domains:

```bash
python -m app.scripts.backfill_skill_domains
```

Optional backfill for skill topics:

```bash
python -m app.scripts.backfill_skill_topics
```

**Seed questions for first 20 exams** (no repeats, all domains/topics, validated — no placeholders). Requires `OPENAI_API_KEY` in `.env`:

```bash
python -m app.scripts.seed_exam_questions --target 40
```

Use `--dry-run` to see how many would be generated per skill/difficulty without calling the API.

## Schema overview

- **users** — name, email, has_taken_baseline_exam
- **skills** — section (MATH/RW), name, domain
- **user_skill_state** — per-user mastery per skill (0 until practice)
- **question_bank** — questions with difficulty, quality_status
- **sessions** — practice or exam, status, module state
- **attempts** — per-question answers
- **exam_module_questions** — exam module/question ordering
- **exam_results** — scaled scores, domain breakdown
