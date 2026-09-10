"""Persist retryable source artifact cleanup."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260909_0003"
down_revision: str | None = "20260909_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table("file_deletions", sa.Column("storage_key", sa.String(500), primary_key=True))


def downgrade() -> None:
    op.drop_table("file_deletions")
