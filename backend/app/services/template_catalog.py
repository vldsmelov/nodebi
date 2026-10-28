"""Revision-guarded metadata operations for both immutable template families."""

import hashlib
import json
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.models import ReportDocument
from app.schemas.analytical_templates import AnalyticalTemplate
from app.schemas.report_templates import ReportTemplate
from app.schemas.template_catalog import (
    FrozenTemplateCatalog,
    FrozenTemplateMetadata,
    TemplateCatalogEdit,
    TemplateCatalogEntry,
    TemplateCatalogPage,
    TemplateFamily,
    TemplateState,
)
from app.services.projects import ProjectService

TEMPLATE_KINDS = ("analytical_template", "report_template")
RECEIPT_KIND = "template_catalog_receipt"


def template_name(row: ReportDocument) -> str:
    return FrozenTemplateMetadata.model_validate(
        {
            "name": row.payload.get("catalog", {}).get("name", row.payload["template"]["name"]),
            "archived": row.status == "archived",
        }
    ).name


def require_active_template(row: ReportDocument, expected_revision: int | None) -> None:
    if row.status == "archived":
        raise ApplicationError(
            "TEMPLATE_ARCHIVED",
            "This template is archived. Restore it in the template catalog before using it.",
            409,
        )
    if expected_revision is not None and expected_revision != row.revision:
        raise ApplicationError(
            "TEMPLATE_REVISION_CONFLICT",
            "The template changed. Reload the template list before using it.",
            409,
        )


def catalog_entry(row: ReportDocument) -> TemplateCatalogEntry:
    if row.kind == "analytical_template":
        analytical = AnalyticalTemplate.model_validate(row.payload["template"])
        presentation: str = analytical.settings.analysis.type
        family: TemplateFamily = "analytical"
        grain, fields = analytical.input_grain, analytical.fields
    else:
        report = ReportTemplate.model_validate(row.payload["template"])
        presentation = report.settings.presentation
        family = "report"
        grain, fields = report.input_grain, report.fields
    return TemplateCatalogEntry(
        id=row.id,
        family=family,
        name=template_name(row),
        input_grain=grain,
        fields=fields,
        presentation=presentation,
        revision=row.revision,
        archived=row.status == "archived",
    )


class TemplateCatalogService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(
        self,
        project_id: uuid.UUID,
        query: str = "",
        family: TemplateFamily | None = None,
        state: TemplateState = "active",
        offset: int = 0,
        limit: int = 20,
    ) -> TemplateCatalogPage:
        ProjectService(self.session).get(project_id)
        # Catalog metadata is bounded at 200 entries, not a data-table scan. casefold is
        # deterministic across SQLite/PostgreSQL and handles Cyrillic names consistently.
        rows = self.session.scalars(
            select(ReportDocument).where(
                ReportDocument.project_id == project_id, ReportDocument.kind.in_(TEMPLATE_KINDS)
            )
        )
        entries = [catalog_entry(row) for row in rows]
        archived = sum(item.archived for item in entries)
        search = query.strip().casefold()
        selected = [
            item
            for item in entries
            if (family is None or item.family == family)
            and (state == "all" or item.archived == (state == "archived"))
            and (not search or search in f"{item.name}\n{item.input_grain}".casefold())
        ]
        selected.sort(key=lambda item: (item.name.casefold(), str(item.id)))
        return TemplateCatalogPage(
            items=selected[offset : offset + limit],
            total=len(selected),
            offset=offset,
            limit=limit,
            active_count=len(entries) - archived,
            archived_count=archived,
        )

    def edit(
        self, project_id: uuid.UUID, template_id: uuid.UUID, request: TemplateCatalogEdit
    ) -> TemplateCatalogEntry:
        ProjectService(self.session).lock(project_id)
        fingerprint = hashlib.sha256(
            json.dumps(
                {"template_id": str(template_id), "request": request.model_dump(mode="json")},
                sort_keys=True,
            ).encode()
        ).hexdigest()
        receipt = self.session.get(ReportDocument, request.request_id)
        if receipt:
            if (
                receipt.project_id != project_id
                or receipt.kind != RECEIPT_KIND
                or receipt.payload.get("fingerprint") != fingerprint
            ):
                raise ApplicationError(
                    "TEMPLATE_CONFLICT",
                    "This request identity was used for different template settings.",
                    409,
                )
            return TemplateCatalogEntry.model_validate(receipt.payload["result"])
        row = self.session.get(ReportDocument, template_id)
        if row is None or row.project_id != project_id or row.kind not in TEMPLATE_KINDS:
            raise ApplicationError(
                "TEMPLATE_NOT_FOUND", "Template does not exist in this project.", 404
            )
        if row.revision != request.expected_revision:
            raise ApplicationError(
                "TEMPLATE_REVISION_CONFLICT",
                "The template changed. Reload the catalog before saving.",
                409,
            )
        name = request.name if request.name is not None else template_name(row)
        archived = request.archived if request.archived is not None else row.status == "archived"
        if name != template_name(row) or archived != (row.status == "archived"):
            row.payload = {**row.payload, "catalog": {"name": name}}
            row.status = "archived" if archived else "saved"
            row.revision += 1
        result = catalog_entry(row)
        self.session.add(
            ReportDocument(
                id=request.request_id,
                project_id=project_id,
                kind=RECEIPT_KIND,
                status="saved",
                payload={"fingerprint": fingerprint, "result": result.model_dump(mode="json")},
            )
        )
        self.session.commit()
        return result


def freeze_template_catalog(session: Session, project_id: uuid.UUID) -> dict[str, Any]:
    """Keep legacy definition arrays and add parallel versioned catalog metadata."""
    content: dict[str, Any] = {"analytical_templates": [], "report_templates": []}
    metadata = FrozenTemplateCatalog()
    rows = session.scalars(
        select(ReportDocument)
        .where(ReportDocument.project_id == project_id, ReportDocument.kind.in_(TEMPLATE_KINDS))
        .order_by(ReportDocument.created_at, ReportDocument.id)
    )
    for row in rows:
        family = "analytical" if row.kind == "analytical_template" else "report"
        model = AnalyticalTemplate if family == "analytical" else ReportTemplate
        content[f"{family}_templates"].append(
            model.model_validate(row.payload["template"]).model_dump(mode="json")
        )
        getattr(metadata, family).append(
            FrozenTemplateMetadata(name=template_name(row), archived=row.status == "archived")
        )
    content["template_catalog"] = metadata.model_dump(mode="json")
    return content


def restore_template_catalog(
    session: Session, project_id: uuid.UUID, content: dict[str, Any]
) -> None:
    metadata = FrozenTemplateCatalog.model_validate(content.get("template_catalog", {}))
    for family, model in (("analytical", AnalyticalTemplate), ("report", ReportTemplate)):
        definitions = content.get(f"{family}_templates", [])
        labels = getattr(metadata, family)
        if "template_catalog" in content and len(labels) != len(definitions):
            raise ApplicationError("INVALID_RELEASE", "The frozen template catalog is incomplete.")
        for index, definition in enumerate(definitions):
            template = model.model_validate(definition)
            label = labels[index] if labels else FrozenTemplateMetadata(name=template.name)
            session.add(
                ReportDocument(
                    project_id=project_id,
                    kind=f"{family}_template",
                    status="archived" if label.archived else "saved",
                    payload={
                        "template": template.model_dump(mode="json"),
                        "catalog": {"name": label.name},
                    },
                )
            )
