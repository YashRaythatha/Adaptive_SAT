"""Add SAT-aligned domain enum values and backfill skills.

Revision ID: 005
Revises: 004
Create Date: 2025-01-01 00:10:00

Adds 8 domain values (4 Math, 4 RW) to match Digital SAT content domains.
Backfills existing skills to use these domains by (section, name).
"""
from typing import Sequence, Union

from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ADD VALUE cannot run inside a transaction in PostgreSQL; use autocommit block
    with op.get_context().autocommit_block():
        for value in [
            "Algebra",
            "Advanced Math",
            "Problem Solving and Data Analysis",
            "Geometry and Trigonometry",
            "Craft and Structure",
            "Information and Ideas",
            "Standard English Conventions",
            "Expression of Ideas",
        ]:
            op.execute(f"ALTER TYPE domainenum ADD VALUE IF NOT EXISTS '{value}'")
    # Backfill skills: set domain by (section, name) to SAT-aligned domain
    op.execute("""
        UPDATE skills SET domain = 'Algebra'::domainenum
        WHERE section = 'MATH' AND name = 'Algebra'
    """)
    op.execute("""
        UPDATE skills SET domain = 'Advanced Math'::domainenum
        WHERE section = 'MATH' AND name = 'Advanced Math'
    """)
    op.execute("""
        UPDATE skills SET domain = 'Problem Solving and Data Analysis'::domainenum
        WHERE section = 'MATH' AND name = 'Problem Solving and Data Analysis'
    """)
    op.execute("""
        UPDATE skills SET domain = 'Geometry and Trigonometry'::domainenum
        WHERE section = 'MATH' AND name = 'Geometry and Trigonometry'
    """)
    op.execute("""
        UPDATE skills SET domain = 'Expression of Ideas'::domainenum
        WHERE section = 'RW' AND name = 'Expression of Ideas'
    """)
    op.execute("""
        UPDATE skills SET domain = 'Standard English Conventions'::domainenum
        WHERE section = 'RW' AND name = 'Standard English Conventions'
    """)
    # Map evidence/words/analysis skills to Information and Ideas or Craft and Structure
    op.execute("""
        UPDATE skills SET domain = 'Information and Ideas'::domainenum
        WHERE section = 'RW' AND name IN (
            'Command of Evidence (Textual)',
            'Command of Evidence (Quantitative)',
            'Analysis in History/Social Studies',
            'Analysis in Science'
        )
    """)
    op.execute("""
        UPDATE skills SET domain = 'Craft and Structure'::domainenum
        WHERE section = 'RW' AND name = 'Words in Context'
    """)


def downgrade() -> None:
    # Revert skills to CORE/ADVANCED/OTHER (match seed_skills original mapping)
    op.execute("""
        UPDATE skills SET domain = 'CORE'::domainenum
        WHERE section = 'MATH' AND name IN ('Algebra', 'Problem Solving and Data Analysis', 'Geometry and Trigonometry')
    """)
    op.execute("""
        UPDATE skills SET domain = 'ADVANCED'::domainenum
        WHERE section = 'MATH' AND name = 'Advanced Math'
    """)
    op.execute("""
        UPDATE skills SET domain = 'CORE'::domainenum
        WHERE section = 'RW'
    """)
    # Note: PostgreSQL does not support removing enum values; new values remain in the type.
    # To fully remove them you would need to recreate the type and column (not done here).