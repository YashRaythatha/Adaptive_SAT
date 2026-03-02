# Adaptive SAT — Frontend

React 18, TypeScript, Vite, React Router v6, Tailwind. Minimal polish; focus on correctness.

## Setup

1. Node 18+
2. `npm install`
3. Copy `.env.example` to `.env`. Optional: set `VITE_API_URL`; if unset, frontend auto-detects backend on port 8000 or 8001.

## Run

```bash
npm run dev
```

App: http://localhost:3000

## Routes

- `/setup` — onboarding / user creation
- `/` — home
- `/exam` — start exam
- `/exam/session/:sessionId` — exam session
- `/practice` — practice (unlocks after baseline)
- `/practice/session/:sessionId` — practice session
- `/progress` — progress view
- `/admin` — admin question review (X-ADMIN-KEY)
