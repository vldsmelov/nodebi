"""Immutable file versions and revisioned report-cycle documents."""

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260924_0010"
down_revision = "20260922_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    op.create_table(
        "source_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "source_id",
            sa.Uuid(),
            sa.ForeignKey("data_sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("workbook", json_type, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_source_versions_source_id", "source_versions", ["source_id"])
    op.create_table(
        "report_documents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Uuid(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("payload", json_type, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_report_documents_project_id", "report_documents", ["project_id"])
    op.create_index("ix_report_documents_kind", "report_documents", ["kind"])
    bind = op.get_bind()
    metadata = sa.MetaData()
    sources = sa.Table("data_sources", metadata, autoload_with=bind)
    versions = sa.Table("source_versions", metadata, autoload_with=bind)
    for row in bind.execute(sa.select(sources)).mappings():
        bind.execute(
            versions.insert().values(
                id=uuid.uuid4(),
                source_id=row["id"],
                storage_key=row["storage_key"],
                filename=row["original_filename"],
                file_size=row["file_size"],
                sha256="",
                workbook=row["metadata"].get("workbook", {}),
            )
        )


def downgrade() -> None:
    op.drop_table("report_documents")
    op.drop_table("source_versions")
