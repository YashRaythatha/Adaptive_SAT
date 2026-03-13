"""Add topic to skills, practice_blueprint_json to sessions, practice_topic_summary table.

Revision ID: 003
Revises: 002
Create Date: 2025-01-01 00:02:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("skills", sa.Column("topic", sa.String(100), nullable=True))
    op.add_column("sessions", sa.Column("practice_blueprint_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("sessions", sa.Column("practice_topic", sa.String(100), nullable=True))
    op.create_table(
        "practice_topic_summary",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic", sa.String(100), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("summary_date", sa.Date(), nullable=False),
        sa.Column("questions_answered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correct_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_practice_topic_summary_user_id", "practice_topic_summary", ["user_id"], unique=False)
    op.create_index("ix_practice_topic_summary_topic", "practice_topic_summary", ["topic"], unique=False)
    op.create_index("ix_practice_topic_summary_summary_date", "practice_topic_summary", ["summary_date"], unique=False)


def downgrade() -> None:
    op.drop_table("practice_topic_summary")
    op.drop_column("sessions", "practice_topic")
    op.drop_column("sessions", "practice_blueprint_json")
    op.drop_column("skills", "topic")
