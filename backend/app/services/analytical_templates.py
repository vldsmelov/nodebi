"""Rebind captured analytical settings, never execute a second calculation model."""

import hashlib
import json
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.infrastructure.storage import StorageProvider
from app.models import DatasetSnapshot, ReportDocument
from app.schemas.analytical_templates import (
    AnalyticalTemplate,
    TemplateCapture,
    TemplateField,
    TemplateList,
    TemplatePrepare,
    TemplateRead,
)
from app.schemas.statistical_reports import StatisticalSettings
from app.schemas.workflows import ResolvedColumnRead
from app.services.projects import ProjectService
from app.services.report_inputs import ReportInputService
from app.services.statistical_editing import StatisticalEditingService
from app.services.template_catalog import require_active_template, template_name

TEMPLATE_KIND = "analytical_template"
FIELD_KEYS = {
    "value_column_id",
    "group_column_id",
    "x_column_id",
    "y_column_id",
    "category_column_id",
    "stage_column_id",
    "order_column_id",
    "kind_column_id",
    "column_id",
    "denominator_column_id",
}


def rebind_settings(
    settings: StatisticalSettings, mapping: dict[str, str], namespace: uuid.UUID
) -> StatisticalSettings:
    def visit(value: Any, key: str = "") -> Any:
        if key in FIELD_KEYS and isinstance(value, str):
            return mapping[value]
        if key == "dimensions":
            return [mapping[field] for field in value]
        if key == "output_id":
            return str(uuid.uuid5(namespace, f"measure:{value}"))
        if isinstance(value, dict):
            return {k: visit(v, k) for k, v in value.items()}
        if isinstance(value, list):
            return [visit(v) for v in value]
        return value

    return StatisticalSettings.model_validate(visit(settings.model_dump(mode="json")))


def referenced_fields(settings: StatisticalSettings) -> list[str]:
    result: list[str] = []

    def visit(value: Any, key: str = "") -> None:
        if key in FIELD_KEYS and isinstance(value, str):
            if value not in result:
                result.append(value)
        elif key == "dimensions":
            for field in value:
                if field not in result:
                    result.append(field)
        elif isinstance(value, dict):
            for k, v in value.items():
                visit(v, k)
        elif isinstance(value, list):
            for item in value:
                visit(item)

    visit(settings.model_dump(mode="json"))
    return result


class AnalyticalTemplateService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings

    @staticmethod
    def read(row: ReportDocument, *, captured: bool = False) -> TemplateRead:
        template = AnalyticalTemplate.model_validate(row.payload["template"])
        return TemplateRead(
            id=row.id,
            revision=1 if captured else row.revision,
            **{**template.model_dump(), "name": template.name if captured else template_name(row)},
        )

    def list(self, project_id: uuid.UUID) -> TemplateList:
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
        return TemplateList(items=[self.read(row) for row in rows])

    def capture(self, project_id: uuid.UUID, request: TemplateCapture) -> TemplateRead:
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
                ReportDocument.kind.in_([TEMPLATE_KIND, "report_template"]),
            )
        )
        if count is not None and count >= 200:
            raise ApplicationError(
                "TEMPLATE_LIMIT", "This project already contains 200 calculation templates."
            )
        view = StatisticalEditingService(self.session, self.storage, self.settings).read(
            project_id, request.visualization_id
        )
        if request.expected_token != view.expected_token:
            raise ApplicationError(
                "REPORT_EDIT_CONFLICT",
                "The project changed. Reload the report before saving your changes.",
                409,
            )
        if not view.editable or view.settings is None:
            raise ApplicationError(
                "REPORT_ADVANCED", view.reason or "Edit this calculation in the graph.", 409
            )
        columns = {c.column_id: c for c in view.columns}
        refs = referenced_fields(view.settings)
        if set(refs) - columns.keys():
            raise ApplicationError(
                "INVALID_TEMPLATE",
                "Configure the upstream calculation in the graph before using the wizard.",
            )
        mapping = {field: f"field_{i + 1}" for i, field in enumerate(refs)}
        fields = [
            TemplateField(
                key=mapping[field],
                name=columns[field].display_name,
                logical_type=columns[field].logical_type,
                unit=columns[field].metadata.get("unit"),
                currency=columns[field].metadata.get("currency"),
            )
            for field in refs
        ]
        template = AnalyticalTemplate(
            name=request.name,
            input_grain=request.input_grain,
            fields=fields,
            settings=rebind_settings(view.settings, mapping, request.request_id),
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
    ) -> StatisticalSettings:
        ProjectService(self.session).lock(project_id)
        row = self.session.get(ReportDocument, template_id)
        if row is None or row.project_id != project_id or row.kind != TEMPLATE_KIND:
            raise ApplicationError(
                "TEMPLATE_NOT_FOUND", "Analytical template does not exist in this project.", 404
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
        return rebind_settings(template.settings, request.mapping, request.request_id).model_copy(
            update={"name": template.name}
        )


def validate_template_input(
    session: Session,
    storage: StorageProvider,
    settings: Settings,
    project_id: uuid.UUID,
    request: TemplatePrepare,
    fields: list[TemplateField],
    name: str,
) -> None:
    """Shared revision, grain and explicit schema mapping checks for both template families."""
    if not request.acknowledge_grain:
        raise ApplicationError(
            "TEMPLATE_GRAIN",
            "Confirm that the selected data has the template's row meaning and units.",
        )
    if set(request.mapping) != {f.key for f in fields} or len(set(request.mapping.values())) != len(
        request.mapping
    ):
        raise ApplicationError(
            "TEMPLATE_MAPPING", "Map every template field to a distinct input field."
        )
    inputs = ReportInputService(session, storage, settings)
    inputs.resolve(project_id, request, name)
    if request.published_input:
        source = request.published_input
        columns = inputs.read(project_id, source.workflow_id, source.publication_id).columns
    else:
        snapshot = session.get(DatasetSnapshot, request.expected_snapshot_id)
        if (
            snapshot is None
            or snapshot.source_id != request.source_id
            or snapshot.resource_id != request.resource_id
        ):
            raise ApplicationError("SOURCE_NOT_FOUND", "Choose a dataset from this project.", 404)
        columns = [ResolvedColumnRead.model_validate(c) for c in snapshot.dataset_schema["columns"]]
    available = {c.column_id: c for c in columns}
    for field in fields:
        column = available.get(request.mapping[field.key])
        if (
            column is None
            or column.logical_type != field.logical_type
            or any(
                expected is not None and column.metadata.get(key) != expected
                for key, expected in (("unit", field.unit), ("currency", field.currency))
            )
        ):
            raise ApplicationError(
                "TEMPLATE_MAPPING",
                "Choose fields with matching logical types, units and currency. "
                "Normalize the data explicitly if needed.",
            )
