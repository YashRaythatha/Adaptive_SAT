# Adaptive SAT

Local-first adaptive SAT practice system. Users must complete a full Digital SAT baseline exam before practice. Postgres-backed, OpenAI for generation/judging. No Docker, no cloud.

## Structure

- **backend/** — FastAPI, SQLAlchemy, Alembic, OpenAI
- **frontend/** — React 18, TypeScript, Vite, React Router, Tailwind

## Quick start

1. Set up PostgreSQL and create a database (see `backend/sql/SETUP_DATABASE.md`).
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`.
3. From `backend/`: create venv, install deps, run migrations, seed skills.
4. From `frontend/`: copy `.env.example` to `.env`, `npm install`, `npm run dev`.
5. Run backend: `run_backend.bat` (uses port 8000, or 8001 if 8000 is in use). Or: `uvicorn app.main:app --host 127.0.0.1 --port 8000`.
6. Run frontend: `run_frontend.bat` or `npm run dev`. Open http://localhost:3000.

See `backend/README.md` and `frontend/README.md` for details.
