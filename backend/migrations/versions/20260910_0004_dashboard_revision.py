"""Add optimistic concurrency to dashboard layout saves."""

import sqlalchemy as sa
from alembic import op

revision = "20260910_0004"
down_revision = "20260909_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dashboards", sa.Column("revision", sa.Integer(), nullable=False, server_default="1")
    )
    op.alter_column("dashboards", "revision", server_default=None)


def downgrade() -> None:
    op.drop_column("dashboards", "revision")
