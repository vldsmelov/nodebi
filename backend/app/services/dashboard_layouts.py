"""Immutable layout copies, independent of shared visualization calculations."""

import hashlib
import json
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.models import DashboardLayoutTemplate
from app.schemas.dashboard_layouts import (
    DashboardLayoutRead,
    DashboardLayoutSave,
    DashboardLayoutSaved,
)
from app.schemas.dashboards import DashboardRead


def default_layout_id(dashboard_id: uuid.UUID) -> uuid.UUID:
    return uuid.uuid5(dashboard_id, "default-layout")


def preserve_default(session: Session, previous: DashboardRead) -> None:
    identity = default_layout_id(previous.id)
    if (
        session.scalar(
            select(DashboardLayoutTemplate.id).where(
                DashboardLayoutTemplate.dashboard_id == previous.id,
                DashboardLayoutTemplate.is_default.is_(True),
            )
        )
        is not None
    ):
        return
    if previous.widgets:
        session.add(
            DashboardLayoutTemplate(
                id=identity,
                dashboard_id=previous.id,
                name="Default layout",
                is_default=True,
                widgets=[w.model_dump(mode="json") for w in previous.widgets],
            )
        )
        session.flush()


class DashboardLayoutService:
    def __init__(self, session: Session):
        self.session = session

    def list(self, dashboard_id: uuid.UUID) -> list[DashboardLayoutRead]:
        from app.services.dashboards import DashboardService

        current = DashboardService(self.session).read(dashboard_id)
        rows = self.session.scalars(
            select(DashboardLayoutTemplate)
            .where(DashboardLayoutTemplate.dashboard_id == dashboard_id)
            .order_by(
                DashboardLayoutTemplate.is_default.desc(),
                DashboardLayoutTemplate.created_at,
                DashboardLayoutTemplate.id,
            )
        ).all()
        result = [self.read(row) for row in rows]
        # Before the first edit the saved dashboard itself is the durable baseline. Reads
        # never write; the first save freezes this same baseline in its transaction.
        if current.widgets and not any(row.is_default for row in rows):
            result.insert(
                0,
                DashboardLayoutRead(
                    id=default_layout_id(dashboard_id),
                    name="Default layout",
                    is_default=True,
                    widgets=current.widgets,
                ),
            )
        return result

    @staticmethod
    def read(row: DashboardLayoutTemplate) -> DashboardLayoutRead:
        return DashboardLayoutRead(
            id=row.id, name=row.name, is_default=row.is_default, widgets=row.widgets
        )

    def save(self, dashboard_id: uuid.UUID, payload: DashboardLayoutSave) -> DashboardLayoutSaved:
        from app.services.dashboards import DashboardService

        service = DashboardService(self.session)
        current = service.read(dashboard_id)
        identity = uuid.uuid5(dashboard_id, str(payload.request_id))
        digest = hashlib.sha256(
            json.dumps(payload.model_dump(mode="json"), sort_keys=True).encode()
        ).hexdigest()
        existing = self.session.get(DashboardLayoutTemplate, identity)
        if existing is not None:
            if existing.request_hash != digest:
                raise ApplicationError(
                    "LAYOUT_REQUEST_CONFLICT",
                    "This save request was already used with different settings.",
                    409,
                )
            if current.revision != existing.saved_revision:
                raise ApplicationError(
                    "DASHBOARD_CONFLICT",
                    "The template was saved, but the dashboard changed afterward. "
                    "Reload before editing.",
                    409,
                )
            return DashboardLayoutSaved(dashboard=current, template=self.read(existing))
        rows = self.session.scalars(
            select(DashboardLayoutTemplate).where(
                DashboardLayoutTemplate.dashboard_id == dashboard_id
            )
        ).all()
        if len(rows) >= 50:
            raise ApplicationError(
                "LAYOUT_TEMPLATE_LIMIT", "A dashboard supports up to 50 layout templates.", 409
            )
        if (
            any(row.name.casefold() == payload.name.casefold() for row in rows)
            or payload.name.casefold() == "default layout"
        ):
            raise ApplicationError(
                "LAYOUT_NAME_EXISTS", "Choose a different name for the new layout template.", 409
            )
        result = service.save(dashboard_id, payload.dashboard, commit=False)
        row = DashboardLayoutTemplate(
            id=identity,
            dashboard_id=dashboard_id,
            name=payload.name,
            is_default=False,
            widgets=[w.model_dump(mode="json") for w in result.widgets],
            request_hash=digest,
            saved_revision=result.revision,
        )
        self.session.add(row)
        self.session.flush()
        template = self.read(row)
        self.session.commit()
        return DashboardLayoutSaved(dashboard=result, template=template)
