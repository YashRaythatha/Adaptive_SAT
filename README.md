# Adaptive SAT

**Source:** [github.com/YashRaythatha/Adaptive_SAT](https://github.com/YashRaythatha/Adaptive_SAT)

A **local-first adaptive SAT practice system**. Users take a full Digital SAT–style practice exam (98 questions, timed modules, 10-minute break), then practice by skill with adaptive difficulty. The app uses **PostgreSQL** for persistence and **OpenAI** for question generation and quality judging. No Docker or cloud required.

---

## Features

- **Full practice exam** — 4 modules (RW Module 1 & 2, Math Module 1 & 2), 27+27+22+22 questions, per-module timers (32 min RW, 35 min Math), 10-minute break between RW and Math. Adaptive routing (easy/hard Module 2) based on Module 1 accuracy. When module time is up, the app auto-advances to the next module or break.
- **Practice by section** — Targeted practice (Reading & Writing or Math) with adaptive difficulty; mastery tracked per skill.
- **Targeted practice by topic** — Optional practice sessions by topic (e.g. Algebra) with a fixed set of 10–20 questions per session.
- **Progress** — View mastery by skill and section.
- **Exam history** — List of past completed exams with date and scores; open any exam to see the **full question-by-question review** (same view as right after the exam): correct answer, your answer, explanation, and skill.
- **Weak areas** — After an exam, see recommended skills to practice based on the result.
- **Question bank** — Questions are generated via OpenAI (with validation and optional judge for difficulty 4–5), stored in PostgreSQL. Duplicate question text is avoided at generation time; scripts are available to check and deduplicate existing data.
- **Admin** — Optional admin UI (protected by `X-ADMIN-KEY`) to list, approve, or reject questions and view stats.

---

## Project structure

```
Adaptive_SAT/
├── backend/                 # FastAPI app
│   ├── app/
│   │   ├── api/             # Routes, deps, error handlers
│   │   ├── core/            # Config (settings, exam constants)
│   │   ├── db/              # SQLAlchemy session, base
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic (exam, practice, question, user, analytics)
│   │   ├── scripts/         # CLI scripts (seed, backfill, dedupe, reports)
│   │   ├── prompts/         # OpenAI prompts (RW/Math questions, judge)
│   │   └── utils/           # Prompt loader, rate limit
│   ├── alembic/             # Migrations
│   ├── docs/                # RUNBOOK.md, etc.
│   ├── sql/                 # SETUP_DATABASE.md
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React SPA
│   ├── src/
│   │   ├── app/             # Pages, components, API client, context, routes
│   │   └── styles/
│   ├── package.json
│   └── .env.example
├── README.md                # This file
├── run_backend.bat / run_backend.sh   # Start backend (port 8000 or 8001)
└── run_frontend.bat / run_frontend.sh # Start frontend (Vite dev server)
```

---

## Tech stack

| Layer    | Stack |
|----------|--------|
| Backend  | Python 3.11+, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, OpenAI (GPT-4o mini / GPT-4o), Pydantic Settings |
| Frontend | React 18, TypeScript, Vite, React Router 7, Tailwind CSS 4, Radix UI, Motion, Lucide icons |
| Auth     | Session-based (user id in sessionStorage); no JWT or OAuth |

---

## Quick start

### 1. Prerequisites

- **Python 3.11+** (backend)
- **Node.js 18+** (frontend)
- **PostgreSQL** (local; create a database, e.g. `adaptive_sat`)

### 2. Database

1. Create the database (see **Database setup** below or `backend/sql/SETUP_DATABASE.md`).
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` (and optionally `OPENAI_API_KEY`, `ADMIN_KEY`).
3. From `backend/`: run migrations and seed data:

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate   # macOS/Linux (Windows: .venv\Scripts\activate)
   pip install -r requirements.txt
   alembic upgrade head
   python -m app.scripts.seed_skills
   python -m app.scripts.seed_exam_questions --target 40   # optional; requires OPENAI_API_KEY
   ```

### 3. Backend

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Or from repo root: **Windows** `run_backend.bat` · **macOS/Linux** `./run_backend.sh` (uses 8000, or 8001 if 8000 is in use).

- API: **http://127.0.0.1:8000**
- Docs: **http://127.0.0.1:8000/docs**

### 4. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Or from repo root: **Windows** `run_frontend.bat` · **macOS/Linux** `./run_frontend.sh`.

- App: **http://localhost:3000**

### 5. Running on macOS (e.g. Mac Mini)

- Use the **shell scripts**: `./run_backend.sh` and `./run_frontend.sh` (from the repo root).
- Activate the backend venv with `source backend/.venv/bin/activate` when running commands manually.
- Install **PostgreSQL** if needed: `brew install postgresql@16` (or 15), then start the service and create the database (see **Database setup**).
- Ensure **Python 3.11+** and **Node.js 18+** are installed (`brew install python@3.12 node` if using Homebrew).

### 6. First use

1. Open http://localhost:3000 → redirects to **Setup** (create user: name, email).
2. **Dashboard** → Start a **Full Practice Exam** or **Practice Session**.
3. After an exam, use **Exam History** to open past exams and **View detailed analysis** for the full question review.

---

## Database setup

PostgreSQL must be running. Create a database named `adaptive_sat` (or another name and set it in `DATABASE_URL`).

**Example (psql):**

```bash
psql -U postgres -c "CREATE DATABASE adaptive_sat;"
```

Set in `backend/.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/adaptive_sat
```

If the password contains special characters (`@`, `#`, `%`), URL-encode them (e.g. `@` → `%40`). Then run:

```bash
cd backend
alembic upgrade head
python -m app.scripts.seed_skills
```

See **backend/sql/SETUP_DATABASE.md** for more options (pgAdmin, SQL Shell) and optional backfills.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/adaptive_sat` |
| `OPENAI_API_KEY` | For generation | Required for question generation and judge (difficulty 4–5). Omit to disable generation. |
| `ADMIN_KEY` | For admin | Secret; send as header `X-ADMIN-KEY` for `/api/admin/*`. Omit to disable admin API. |
| `EXAM_ROUTE_THRESHOLD` | No | M1 accuracy ≥ this value routes to HARD Module 2 (default `0.65`). |
| `EXAM_FIRST_EXAM_NO_REPEAT_UNTIL_SESSIONS` | No | For the first N completed exams, no question repeats across those exams (default `20`). |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend base URL (no trailing slash). Default: auto-detect http://127.0.0.1:8000 or :8001. |

---

## Backend scripts

Run from `backend/` with venv active: `python -m app.scripts.<script_name>`.

| Script | Purpose |
|--------|--------|
| **seed_skills** | Seeds the skills table (RW + Math). **Required** before exams/practice. |
| **seed_exam_questions** | Populates question bank via OpenAI (`--target 40`, `--section MATH|RW`, `--dry-run`). |
| **backfill_skill_domains** | Optional: set skill `domain` (e.g. ADVANCED). |
| **backfill_skill_topics** | Optional: set skill `topic` for reporting. |
| **check_duplicate_questions** | Report duplicate `question_text` in the bank (no writes). |
| **dedupe_questions** | Remove duplicates: keep one per text, update attempts/exam_module_questions, delete extras. Use `--dry-run` first. |
| **question_counts_by_skill_difficulty** | Print total questions and counts by skill and difficulty (D1–D5). |
| **show_questions** | Print question details by ID(s) or `--file ids.txt`. |
| **preview_questions** | Preview sample questions (`--section MATH`, `--count 10`) to check quality. |

Run from `backend/`: `python -m app.scripts.seed_skills`, `python -m app.scripts.seed_exam_questions --target 40`, etc.

---

## API endpoints

All routes are under `/api`. Full interactive docs: **http://127.0.0.1:8000/docs**.

| Area | Method | Path | Description |
|------|--------|------|-------------|
| Health | GET | `/api/health` | Returns `{ "status": "ok" }`. |
| Users | POST | `/api/users` | Create user (body: `name`, `email`). |
| Users | GET | `/api/users/{user_id}` | Get user by ID. |
| Practice | POST | `/api/practice/start` | Start practice. Body: `user_id`, `section`, optional `domain`. |
| Practice | POST | `/api/practice/next` | Next question. Body: `session_id`, `user_id`. |
| Practice | POST | `/api/practice/answer` | Submit answer. Body: `session_id`, `question_id`, `user_answer`, optional `time_taken_sec`. |
| Practice | POST | `/api/practice/end` | End session. Body: `session_id`. |
| Practice | POST | `/api/practice/targeted/start` | Targeted practice by topic (10–20 questions). Body: `user_id`, `topic`. |
| Exam | POST | `/api/exam/start` | Start exam. Body: `user_id`. Builds RW Module 1. |
| Exam | GET | `/api/exam/time_remaining` | Query: `session_id`, `user_id`. Returns `seconds_remaining`, `expired`. |
| Exam | POST | `/api/exam/next` | Next question in current module. Body: `session_id`. 409 when module time expired. |
| Exam | POST | `/api/exam/answer` | Submit answer. Body: `session_id`, `question_id`, `user_answer`. 409 when time expired. |
| Exam | POST | `/api/exam/advance` | Advance to next module / break / end exam. Body: `session_id`. |
| Exam | GET | `/api/exam/result` | Query: `session_id`, `user_id`. Scaled scores, domain breakdown. |
| Exam | GET | `/api/exam/review` | Query: `session_id`, `user_id`. Full review: result + all 98 questions with answers and explanations. |
| Exam | GET | `/api/exam/history` | Query: `user_id`, optional `limit`. Past exams (session_id, ended_at, scores). Newest first. |
| Exam | GET | `/api/exam/weak_areas` | Query: `user_id`, optional `top_n`. Weakest skills from latest exam. |
| Progress | GET | `/api/progress/skills` | Query: `user_id`. Skills with mastery. |
| Analytics | GET | `/api/analytics/topic_accuracy` | Query: `user_id`, optional `topic`, `days`. |
| Analytics | GET | `/api/analytics/practice_vs_exam` | Query: `user_id`. Practice vs latest exam. |
| Admin | GET | `/api/admin/questions` | List questions (query: `status`, `id_prefix`, `skip`, `limit`). Requires header `X-ADMIN-KEY`. |
| Admin | GET | `/api/admin/questions/{id}` | Question detail. |
| Admin | POST | `/api/admin/questions/{id}/approve` | Set APPROVED. |
| Admin | POST | `/api/admin/questions/{id}/reject` | Set REJECTED. |
| Admin | GET | `/api/admin/questions/{id}/stats` | Times used, correct rate. |

---

## Frontend routes

| Path | Description |
|------|-------------|
| `/setup` | Onboarding / create user (name, email). |
| `/` | Dashboard (practice, full exam). |
| `/practice` | Start practice by section. |
| `/practice/session/:sessionId` | Practice session (questions one at a time). |
| `/exam` | Start full practice exam. |
| `/exam/session/:sessionId` | Exam in progress (questions, module timer, break screen). |
| `/exam/review/:sessionId` | Full review of a completed exam (all 98 questions, answers, explanations). |
| `/exam/history` | List of past exams; click one to open its review. |
| `/progress` | Progress by skill/section. |
| `/admin` | Admin question list (requires admin key in env). |
| `/admin/questions/:questionId` | Question detail, approve/reject. |

---

## Full practice exam flow (summary)

1. User starts exam → backend creates session, builds **RW Module 1** (27 questions), starts 32‑minute timer.
2. User answers questions one by one; **module timer** is shown and polled every second. When time is up, the app **auto-advances** (no click required).
3. When the module has no more questions (or time expired), frontend calls **advance** → backend builds **RW Module 2** (27 questions, easy/hard by M1 accuracy) or enters **10‑minute break** (between RW and Math), or builds **Math Module 1** (22 questions), then **Math Module 2** (22 questions), or **ends exam**.
4. After the last module, backend computes scores (RW/Math/total scaled 200–800), writes **exam_result**, updates user and mastery. Frontend shows result and weak areas; user can open **View detailed analysis** (same as **Exam review** for that session) or **Exam History** later.

No question is repeated within the same exam; generation avoids duplicating existing question text for the same skill.

---

## Tests

**Backend** (from `backend/`):

```bash
# No DB required
pytest tests/test_question_validation.py tests/test_api_health.py -v

# With PostgreSQL (set DATABASE_URL)
pytest tests/ -v
```

---

## Troubleshooting

See **backend/docs/RUNBOOK.md** for:

- Database connection errors
- Migration issues
- OpenAI / rate limits / judge failures
- Admin 403 (X-ADMIN-KEY)
- “No questions” or “No skills found” (seed skills, seed questions)

---

## Pushing to GitHub

Repo: [github.com/YashRaythatha/Adaptive_SAT](https://github.com/YashRaythatha/Adaptive_SAT)

After making changes locally, commit and push:

```bash
git add -A
git commit -m "Your message"
git push -u origin main
```

**If `git push` asks for login**, use one of these:

| Method | Steps |
|--------|--------|
| **GitHub CLI** | Install [GitHub CLI](https://cli.github.com/), run `gh auth login`, then `git push` works. |
| **SSH** | [Add an SSH key to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh), then: `git remote set-url origin git@github.com:YashRaythatha/Adaptive_SAT.git` and run `git push`. |
| **Personal Access Token** | [Create a token](https://github.com/settings/tokens) (classic, **repo** scope). When Git asks for password, paste the token (not your GitHub password). |

If the remote already has different commits, use `git pull origin main --rebase` then `git push`, or `git push --force origin main` only if you intend to overwrite the remote branch.

---

## License

This is a local-first project. Use and modify as needed.
