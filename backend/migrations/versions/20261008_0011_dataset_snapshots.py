"""Source-neutral import profiles and immutable normalized Parquet snapshots."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261008_0011"
down_revision = "20260924_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    op.create_table(
        "dataset_snapshots",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "source_id",
            sa.Uuid(),
            sa.ForeignKey("data_sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_version_id",
            sa.Uuid(),
            sa.ForeignKey("source_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("resource_id", sa.String(255), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False, unique=True),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("profile", json_type, nullable=False),
        sa.Column("dataset_schema", json_type, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("source_id", "request_id"),
    )
    op.create_index("ix_dataset_snapshots_source_id", "dataset_snapshots", ["source_id"])
    op.create_index(
        "ix_dataset_snapshots_source_version_id", "dataset_snapshots", ["source_version_id"]
    )


def downgrade() -> None:
    op.drop_table("dataset_snapshots")
