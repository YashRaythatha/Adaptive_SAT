"""Main API router; mount health and future route modules here."""
from fastapi import APIRouter

from app.api.routes import health, users, questions, admin, practice, exam, analytics, progress

api_router = APIRouter(prefix="/api", tags=["api"])

api_router.include_router(health.router)
api_router.include_router(users.router)
api_router.include_router(questions.router)
api_router.include_router(admin.router)
api_router.include_router(practice.router)
api_router.include_router(exam.router)
api_router.include_router(analytics.router)
api_router.include_router(progress.router)
