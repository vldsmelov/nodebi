"""Durable report-cycle documents. File versions are append-only."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base
from app.models.persistence import TimestampMixin, json_type


class SourceVersion(TimestampMixin, Base):
    __tablename__ = "source_versions"
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("data_sources.id", ondelete="CASCADE"), index=True
    )
    storage_key: Mapped[str] = mapped_column(String(500))
    filename: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64), default="")
    workbook: Mapped[dict[str, Any]] = mapped_column(json_type, default=dict)


class ReportDocument(TimestampMixin, Base):
    """Revisioned envelope; kind-specific payloads are validated at the service boundary."""

    __tablename__ = "report_documents"
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(30), index=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    payload: Mapped[dict[str, Any]] = mapped_column(json_type, default=dict)
