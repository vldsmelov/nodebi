"""Immutable default and named dashboard layouts; current dashboards are not rewritten."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261021_0012"
down_revision = "20261008_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dashboard_layout_templates",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "dashboard_id",
            sa.Uuid(),
            sa.ForeignKey("dashboards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column(
            "widgets", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=False
        ),
        sa.Column("request_hash", sa.String(64)),
        sa.Column("saved_revision", sa.Integer()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_dashboard_layout_templates_dashboard_id", "dashboard_layout_templates", ["dashboard_id"]
    )

    op.create_index(
        "uq_dashboard_default_layout",
        "dashboard_layout_templates",
        ["dashboard_id"],
        unique=True,
        postgresql_where=sa.text("is_default"),
        sqlite_where=sa.text("is_default"),
    )


def downgrade() -> None:
    op.drop_table("dashboard_layout_templates")
