"""
Backfill topic for skills. Maps skill name to a topic string.
  python -m app.scripts.backfill_skill_topics
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.skill import Skill

# Map skill name (or part) to topic for reporting
TOPIC_MAP = {
    "Command of Evidence (Textual)": "Evidence (Textual)",
    "Command of Evidence (Quantitative)": "Evidence (Quantitative)",
    "Words in Context": "Words in Context",
    "Analysis in History": "Analysis (History/Social Studies)",
    "History/Social Studies": "Analysis (History/Social Studies)",
    "Analysis in Science": "Analysis (Science)",
    "Expression of Ideas": "Expression of Ideas",
    "Standard English Conventions": "Standard English Conventions",
    "Algebra": "Algebra",
    "Advanced Math": "Advanced Math",
    "Problem Solving and Data Analysis": "Problem Solving and Data Analysis",
    "Geometry and Trigonometry": "Geometry and Trigonometry",
}


def backfill_topics() -> None:
    db = SessionLocal()
    try:
        skills = db.query(Skill).all()
        updated = 0
        for s in skills:
            topic = None
            for key, t in TOPIC_MAP.items():
                if key in s.name:
                    topic = t
                    break
            if topic and (s.topic is None or s.topic != topic):
                s.topic = topic
                updated += 1
        db.commit()
        print(f"Backfilled topic for {updated} skills.")
    finally:
        db.close()


if __name__ == "__main__":
    backfill_topics()
