"""Preserve field projections on workflow connections without changing v1 edges."""

import sqlalchemy as sa
from alembic import op

revision = "20260921_0007"
down_revision = "20260915_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("workflow_edges", sa.Column("source_column_id", sa.String(200), nullable=True))


def downgrade() -> None:
    # Dropping this column would silently turn a field wire into a table wire.
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        # Keep the check and DDL atomic against a concurrent graph save.
        connection.execute(sa.text("LOCK TABLE workflow_edges IN ACCESS EXCLUSIVE MODE"))
    count = connection.scalar(
        sa.text("SELECT count(*) FROM workflow_edges WHERE source_column_id IS NOT NULL")
    )
    if count:
        raise RuntimeError(
            "Cannot downgrade while field connections exist. Export or remove them first."
        )
    op.drop_column("workflow_edges", "source_column_id")
