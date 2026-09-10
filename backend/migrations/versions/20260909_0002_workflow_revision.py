"""Separate workflow format version from save revision."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260909_0002"
down_revision: str | None = "20260904_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workflows", sa.Column("revision", sa.Integer(), nullable=False, server_default="1")
    )
    op.execute("UPDATE workflows SET revision = version, version = 1")
    op.alter_column("workflows", "revision", server_default=None)


def downgrade() -> None:
    op.execute("UPDATE workflows SET version = revision")
    op.drop_column("workflows", "revision")
