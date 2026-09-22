"""Published results and independently revisioned visualizations."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260922_0009"
down_revision = "20260921_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    op.add_column(
        "workflows", sa.Column("result_catalog", json_type, nullable=False, server_default="{}")
    )
    op.add_column("visualizations", sa.Column("publication_id", sa.Uuid(), nullable=True))
    op.add_column(
        "visualizations", sa.Column("revision", sa.Integer(), nullable=False, server_default="1")
    )


def downgrade() -> None:
    op.drop_column("visualizations", "revision")
    op.drop_column("visualizations", "publication_id")
    op.drop_column("workflows", "result_catalog")
