import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base

json_type = JSON().with_variant(JSONB(), "postgresql")


class FileDeletion(Base):
    __tablename__ = "file_deletions"
    storage_key: Mapped[str] = mapped_column(String(500), primary_key=True)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)


class DataSource(TimestampMixin, Base):
    __tablename__ = "data_sources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    source_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", json_type, default=dict)


class Workflow(TimestampMixin, Base):
    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parameters: Mapped[list[dict[str, Any]]] = mapped_column(
        json_type, default=list, server_default="[]", nullable=False
    )


class WorkflowNode(TimestampMixin, Base):
    __tablename__ = "workflow_nodes"
    __table_args__ = (UniqueConstraint("workflow_id", "id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workflows.id", ondelete="CASCADE"), index=True
    )
    node_type: Mapped[str] = mapped_column(String(100), nullable=False)
    node_version: Mapped[int] = mapped_column(Integer, nullable=False)
    position_x: Mapped[float] = mapped_column(Float, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(json_type, default=dict)
    ui_state: Mapped[dict[str, Any]] = mapped_column(json_type, default=dict)


class WorkflowEdge(Base):
    __tablename__ = "workflow_edges"
    __table_args__ = (
        ForeignKeyConstraint(
            ["workflow_id", "source_node_id"],
            ["workflow_nodes.workflow_id", "workflow_nodes.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["workflow_id", "target_node_id"],
            ["workflow_nodes.workflow_id", "workflow_nodes.id"],
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "workflow_id", "source_node_id", "source_port", "target_node_id", "target_port"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workflows.id", ondelete="CASCADE"), index=True
    )
    source_node_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    source_port: Mapped[str] = mapped_column(String(100), nullable=False)
    target_node_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    target_port: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Visualization(TimestampMixin, Base):
    __tablename__ = "visualizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workflows.id", ondelete="CASCADE"), index=True
    )
    source_node_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workflow_nodes.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(json_type, default=dict)


class Dashboard(TimestampMixin, Base):
    __tablename__ = "dashboards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    configuration: Mapped[dict[str, Any]] = mapped_column(
        json_type, default=dict, server_default="{}", nullable=False
    )


class DashboardWidget(TimestampMixin, Base):
    __tablename__ = "dashboard_widgets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("dashboards.id", ondelete="CASCADE"), index=True
    )
    visualization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("visualizations.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str | None] = mapped_column(String(200))
    position_x: Mapped[int] = mapped_column(Integer, nullable=False)
    position_y: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(json_type, default=dict)
