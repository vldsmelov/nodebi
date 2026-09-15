"""Persist dashboard declarations, bindings and parent links."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260915_0006"
down_revision = "20260915_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dashboards",
        sa.Column(
            "configuration",
            sa.JSON().with_variant(JSONB(), "postgresql"),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    op.drop_column("dashboards", "configuration")
