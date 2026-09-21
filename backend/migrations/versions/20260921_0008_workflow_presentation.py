"""Persist workbook/composite references atomically with workflow revisions."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260921_0008"
down_revision = "20260921_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "workflows",
        sa.Column(
            "presentation",
            sa.JSON().with_variant(JSONB(), "postgresql"),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        connection.execute(sa.text("LOCK TABLE workflows IN ACCESS EXCLUSIVE MODE"))
    table = sa.table("workflows", sa.column("presentation", sa.JSON()))
    # Canonical empty metadata is {}, but also accept explicitly empty lists.
    for value in connection.execute(sa.select(table.c.presentation)).scalars():
        if any(value.values()):
            raise RuntimeError(
                "Cannot downgrade while workflow containers exist. Export or remove them first."
            )
    op.drop_column("workflows", "presentation")
