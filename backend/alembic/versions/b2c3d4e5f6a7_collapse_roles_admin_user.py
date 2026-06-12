"""collapse roles to admin | user

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-11 02:10:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Map legacy roles onto the two-role model (admin | user)."""
    op.execute(
        "UPDATE users SET role = 'user' "
        "WHERE role IN ('coordinator', 'medical_director')"
    )


def downgrade() -> None:
    """Best-effort reverse: legacy distinction is lost, so map back to coordinator."""
    op.execute("UPDATE users SET role = 'coordinator' WHERE role = 'user'")
