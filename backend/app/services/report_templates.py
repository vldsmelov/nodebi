"""Immutable reusable report settings; normal report compilation remains authoritative."""

import hashlib
import json
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.datasets import ColumnSchema, DatasetSchema, LogicalType
from app.domain.errors import ApplicationError
from app.infrastructure.storage import StorageProvider
from app.models import ReportDocument
from app.schemas.analytical_templates import TemplateCapture, TemplateField, TemplatePrepare
from app.schemas.report_builder import ReportSettings
from app.schemas.report_templates import ReportTemplate, ReportTemplateList, ReportTemplateRead
from app.services.analytical_templates import validate_template_input
from app.services.projects import ProjectService
from app.services.report_editing import ReportEditingService
from app.services.report_template_mapping import canonical_settings, rebind_report_settings
from app.services.template_catalog import require_active_template, template_name

TEMPLATE_KIND = "report_template"


class ReportTemplateService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings

    @staticmethod
    def read(row: ReportDocument, *, captured: bool = False) -> ReportTemplateRead:
        template = ReportTemplate.model_validate(row.payload["template"])
        return ReportTemplateRead(
            id=row.id,
            revision=1 if captured else row.revision,
            **{**template.model_dump(), "name": template.name if captured else template_name(row)},
        )

    def list(self, project_id: uuid.UUID) -> ReportTemplateList:
        ProjectService(self.session).get(project_id)
        rows = self.session.scalars(
            select(ReportDocument)
            .where(
                ReportDocument.project_id == project_id,
                ReportDocument.kind == TEMPLATE_KIND,
                ReportDocument.status != "archived",
            )
            .order_by(ReportDocument.created_at, ReportDocument.id)
        )
        return ReportTemplateList(items=[self.read(row) for row in rows])

    def capture(self, project_id: uuid.UUID, request: TemplateCapture) -> ReportTemplateRead:
        ProjectService(self.session).lock(project_id)
        fingerprint = hashlib.sha256(
            json.dumps(request.model_dump(mode="json"), sort_keys=True).encode()
        ).hexdigest()
        existing = self.session.get(ReportDocument, request.request_id)
        if existing:
            if (
                existing.project_id != project_id
                or existing.kind != TEMPLATE_KIND
                or existing.payload.get("fingerprint") != fingerprint
            ):
                raise ApplicationError(
                    "TEMPLATE_CONFLICT",
                    "This request identity was used for different template settings.",
                    409,
                )
            return self.read(existing, captured=True)
        count = self.session.scalar(
            select(func.count())
            .select_from(ReportDocument)
            .where(
                ReportDocument.project_id == project_id,
                ReportDocument.kind.in_(["analytical_template", TEMPLATE_KIND]),
            )
        )
        if count is not None and count >= 200:
            raise ApplicationError(
                "TEMPLATE_LIMIT", "This project already contains 200 calculation templates."
            )
        view = ReportEditingService(self.session, self.storage, self.settings).read(
            project_id, request.visualization_id
        )
        if view.expected_token != request.expected_token:
            raise ApplicationError(
                "REPORT_EDIT_CONFLICT",
                "The project changed. Reload the report before saving your changes.",
                409,
            )
        if not view.editable or view.settings is None:
            raise ApplicationError(
                "REPORT_ADVANCED", view.reason or "Edit this calculation in the graph.", 409
            )
        aggregate = next(
            (s.node_id for s in view.steps if s.editable and s.type == "group_by"), None
        )
        if aggregate is None:
            raise ApplicationError("INVALID_TEMPLATE", "The report aggregation is unavailable.")
        schema = DatasetSchema(
            tuple(
                ColumnSchema(
                    c.column_id,
                    c.engine_name,
                    c.display_name,
                    LogicalType(c.logical_type),
                    c.nullable,
                    c.metadata,
                )
                for c in view.columns
            )
        )
        settings = ReportSettings.model_validate(
            view.settings.model_dump(exclude={"rebind_fields"})
        )
        try:
            canonical = canonical_settings(settings, schema, aggregate)
            mapping = {column.column_id: f"field_{i + 1}" for i, column in enumerate(view.columns)}
            rebound, used = rebind_report_settings(
                canonical, mapping, request.request_id, aggregate
            )
        except (ValueError, StopIteration) as exc:
            raise ApplicationError(
                "INVALID_TEMPLATE", "Correct the report calculation before saving a template."
            ) from exc
        if len(used) > 96:
            raise ApplicationError(
                "TEMPLATE_LIMIT", "A template can reference at most 96 input fields."
            )
        template = ReportTemplate(
            name=request.name,
            input_grain=request.input_grain,
            settings=rebound,
            fields=[
                TemplateField(
                    key=mapping[c.column_id],
                    name=c.display_name,
                    logical_type=c.logical_type,
                    unit=c.metadata.get("unit"),
                    currency=c.metadata.get("currency"),
                )
                for c in view.columns
                if c.column_id in used
            ],
        )
        row = ReportDocument(
            id=request.request_id,
            project_id=project_id,
            kind=TEMPLATE_KIND,
            status="saved",
            payload={"fingerprint": fingerprint, "template": template.model_dump(mode="json")},
        )
        self.session.add(row)
        self.session.commit()
        return self.read(row, captured=True)

    def prepare(
        self, project_id: uuid.UUID, template_id: uuid.UUID, request: TemplatePrepare
    ) -> ReportSettings:
        ProjectService(self.session).lock(project_id)
        row = self.session.get(ReportDocument, template_id)
        if row is None or row.project_id != project_id or row.kind != TEMPLATE_KIND:
            raise ApplicationError(
                "TEMPLATE_NOT_FOUND", "Report template does not exist in this project.", 404
            )
        require_active_template(row, request.expected_template_revision)
        template = self.read(row)
        validate_template_input(
            self.session,
            self.storage,
            self.settings,
            project_id,
            request,
            template.fields,
            template.name,
        )
        result, _ = rebind_report_settings(template.settings, request.mapping, request.request_id)
        return result.model_copy(update={"name": template.name})
