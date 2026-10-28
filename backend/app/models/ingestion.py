"""Append-only normalized datasets; active selection lives on the source metadata."""

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base
from app.models.persistence import TimestampMixin, json_type


class DatasetSnapshot(TimestampMixin, Base):
    __tablename__ = "dataset_snapshots"
    __table_args__ = (UniqueConstraint("source_id", "request_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("data_sources.id", ondelete="CASCADE"), index=True
    )
    source_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("source_versions.id", ondelete="CASCADE"), index=True
    )
    resource_id: Mapped[str] = mapped_column(String(255))
    request_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64))
    storage_key: Mapped[str] = mapped_column(String(500), unique=True)
    row_count: Mapped[int] = mapped_column(Integer)
    profile: Mapped[dict[str, Any]] = mapped_column(json_type)
    dataset_schema: Mapped[dict[str, Any]] = mapped_column(json_type)
