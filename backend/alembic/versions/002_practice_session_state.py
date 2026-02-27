"""Add practice session state: current_practice_skill_id, current_practice_difficulty.

Revision ID: 002
Revises: 001
Create Date: 2025-01-01 00:01:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("current_practice_skill_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("sessions", sa.Column("current_practice_difficulty", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_sessions_current_practice_skill",
        "sessions",
        "skills",
        ["current_practice_skill_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_sessions_current_practice_skill", "sessions", type_="foreignkey")
    op.drop_column("sessions", "current_practice_difficulty")
    op.drop_column("sessions", "current_practice_skill_id")
