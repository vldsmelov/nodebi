import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base
from app.models.persistence import TimestampMixin, json_type


class DashboardLayoutTemplate(TimestampMixin, Base):
    __tablename__ = "dashboard_layout_templates"
    __table_args__ = (
        Index(
            "uq_dashboard_default_layout",
            "dashboard_id",
            unique=True,
            postgresql_where=text("is_default"),
            sqlite_where=text("is_default"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("dashboards.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    widgets: Mapped[list[dict[str, Any]]] = mapped_column(json_type)
    request_hash: Mapped[str | None] = mapped_column(String(64))
    saved_revision: Mapped[int | None] = mapped_column(Integer)
