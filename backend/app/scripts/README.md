# Backend scripts (`app/scripts`)

## Required for setup / app to work

| Script | Purpose |
|--------|--------|
| **seed_skills.py** | Seeds the `skills` table (RW + MATH). Run after migrations. Required before exams/practice. |
| **seed_exam_questions.py** | Populates the question bank for exams (calls LLM). Use `--target`, `--section`, `--dry-run` as needed. |

## Optional one-time setup

| Script | Purpose |
|--------|--------|
| **backfill_skill_domains.py** | Sets skill `domain` (e.g. ADVANCED for "Advanced Math"). Run after seed_skills if you care about domain. |
| **backfill_skill_topics.py** | Sets skill `topic` for reporting. Run after seed_skills if you use topic-based analytics. |

## Maintenance and reporting

| Script | Purpose |
|--------|--------|
| **check_duplicate_questions.py** | Report duplicate question_text in the bank (no writes). |
| **dedupe_questions.py** | Remove duplicates: keep one per text, update attempts/exam_module_questions, delete extras. Use `--dry-run` first. |
| **question_counts_by_skill_difficulty.py** | Print total questions and counts by skill and difficulty (D1–D5). |

## Admin / debugging (optional)

| Script | Purpose |
|--------|--------|
| **show_questions.py** | Print full question details by ID(s) or `--file ids.txt`. |
| **preview_questions.py** | Preview sample questions from the bank (e.g. `--count 8`, `--section MATH`) to check quality. |

## Run from backend root

```bash
cd backend
python -m app.scripts.seed_skills
python -m app.scripts.seed_exam_questions --target 40
python -m app.scripts.check_duplicate_questions
python -m app.scripts.question_counts_by_skill_difficulty
```
