"""Initial schema: users, skills, user_skill_state, question_bank, sessions, attempts, exam_module_questions, exam_results.

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types (must exist before use in columns)
    section_enum = postgresql.ENUM("MATH", "RW", name="sectionenum", create_type=True)
    section_enum.create(op.get_bind(), checkfirst=True)
    section_enum_type = postgresql.ENUM("MATH", "RW", name="sectionenum", create_type=False)
    domain_enum = postgresql.ENUM("CORE", "ADVANCED", "OTHER", name="domainenum", create_type=True)
    domain_enum.create(op.get_bind(), checkfirst=True)
    domain_enum_type = postgresql.ENUM("CORE", "ADVANCED", "OTHER", name="domainenum", create_type=False)
    quality_status_enum = postgresql.ENUM("DRAFT", "APPROVED", "REJECTED", name="qualitystatusenum", create_type=True)
    quality_status_enum.create(op.get_bind(), checkfirst=True)
    quality_status_enum_type = postgresql.ENUM("DRAFT", "APPROVED", "REJECTED", name="qualitystatusenum", create_type=False)
    session_mode_enum = postgresql.ENUM("PRACTICE", "EXAM", name="sessionmodeenum", create_type=True)
    session_mode_enum.create(op.get_bind(), checkfirst=True)
    session_mode_enum_type = postgresql.ENUM("PRACTICE", "EXAM", name="sessionmodeenum", create_type=False)
    session_status_enum = postgresql.ENUM("ACTIVE", "ENDED", name="sessionstatusenum", create_type=True)
    session_status_enum.create(op.get_bind(), checkfirst=True)
    session_status_enum_type = postgresql.ENUM("ACTIVE", "ENDED", name="sessionstatusenum", create_type=False)
    exam_question_status_enum = postgresql.ENUM("UNSEEN", "ANSWERED", "SKIPPED", name="examquestionstatusenum", create_type=True)
    exam_question_status_enum.create(op.get_bind(), checkfirst=True)
    exam_question_status_enum_type = postgresql.ENUM("UNSEEN", "ANSWERED", "SKIPPED", name="examquestionstatusenum", create_type=False)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("has_taken_baseline_exam", sa.Boolean(), nullable=False, server_default="false"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section", section_enum_type, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(2000), nullable=True),
        sa.Column("domain", domain_enum_type, nullable=False, server_default="CORE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_skills_section", "skills", ["section"], unique=False)
    op.create_index("ix_skills_domain", "skills", ["domain"], unique=False)

    op.create_table(
        "user_skill_state",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mastery_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "skill_id"),
    )

    op.create_table(
        "question_bank",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section", section_enum_type, nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("difficulty_llm", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("choices_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("correct_answer", sa.String(500), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("quality_status", quality_status_enum_type, nullable=False, server_default="DRAFT"),
        sa.Column("source_model", sa.String(100), nullable=True),
        sa.Column("prompt_version", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_question_bank_section", "question_bank", ["section"], unique=False)
    op.create_index("ix_question_bank_skill_id", "question_bank", ["skill_id"], unique=False)
    op.create_index("ix_question_bank_quality_status", "question_bank", ["quality_status"], unique=False)
    op.create_index(
        "ix_question_bank_section_skill_difficulty_status",
        "question_bank",
        ["section", "skill_id", "difficulty_llm", "quality_status"],
        unique=False,
    )

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mode", session_mode_enum_type, nullable=False),
        sa.Column("status", session_status_enum_type, nullable=False, server_default="ACTIVE"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_section", section_enum_type, nullable=True),
        sa.Column("current_module", sa.Integer(), nullable=True),
        sa.Column("current_module_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_module_time_limit_sec", sa.Integer(), nullable=True),
        sa.Column("practice_domain", sa.String(100), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"], unique=False)
    op.create_index("ix_sessions_mode", "sessions", ["mode"], unique=False)
    op.create_index("ix_sessions_status", "sessions", ["status"], unique=False)

    op.create_table(
        "attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_answer", sa.String(500), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("time_taken_sec", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["question_id"], ["question_bank.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_attempts_session_id", "attempts", ["session_id"], unique=False)
    op.create_index("ix_attempts_question_id", "attempts", ["question_id"], unique=False)

    op.create_table(
        "exam_module_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section", section_enum_type, nullable=False),
        sa.Column("module_number", sa.Integer(), nullable=False),
        sa.Column("question_order", sa.Integer(), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", exam_question_status_enum_type, nullable=False, server_default="UNSEEN"),
        sa.Column("served_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["question_id"], ["question_bank.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "section", "module_number", "question_order", name="uq_exam_module_question_order"),
    )
    op.create_index("ix_exam_module_questions_session_id", "exam_module_questions", ["session_id"], unique=False)
    op.create_index("ix_exam_module_questions_section", "exam_module_questions", ["section"], unique=False)
    op.create_index("ix_exam_module_questions_question_id", "exam_module_questions", ["question_id"], unique=False)

    op.create_table(
        "exam_results",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rw_module1_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rw_module2_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("math_module1_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("math_module2_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rw_total_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("math_total_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("domain_breakdown_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("rw_scaled", sa.Integer(), nullable=True),
        sa.Column("math_scaled", sa.Integer(), nullable=True),
        sa.Column("total_scaled", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("session_id"),
    )
    op.create_index("ix_exam_results_user_id", "exam_results", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("exam_results")
    op.drop_table("exam_module_questions")
    op.drop_table("attempts")
    op.drop_table("sessions")
    op.drop_table("question_bank")
    op.drop_table("user_skill_state")
    op.drop_table("skills")
    op.drop_table("users")

    postgresql.ENUM(name="examquestionstatusenum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="sessionstatusenum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="sessionmodeenum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="qualitystatusenum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="domainenum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="sectionenum").drop(op.get_bind(), checkfirst=True)
