"""Guarded in-place alignment/formula edits with ordinary graph execution and receipts."""

import hashlib
import json
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.publications import ResultCatalog
from app.domain.visualizations import VisualizationConfig
from app.infrastructure.storage import StorageProvider
from app.models import DashboardWidget, ReportDocument, Visualization, Workflow
from app.nodes import get_node_registry
from app.schemas.alignment_reports import (
    AlignmentEditRead,
    AlignmentEditRequest,
    AlignmentReportFields,
    AlignmentReportPreview,
)
from app.schemas.report_builder import ReportEditResult, ReportStep
from app.schemas.workflows import ResolvedColumnRead, WorkflowRead, WorkflowSave
from app.services.alignment_projection import AlignmentSuffix, patch_alignment, recognize_alignment
from app.services.alignment_reports import AlignmentReportService
from app.services.execution import ExecutionPlanner, InMemoryExecutionCache
from app.services.independent_visualizations import IndependentVisualizationService
from app.services.projects import ProjectService
from app.services.report_projection import as_graph, presentation_references
from app.services.source_updates import state_token
from app.services.workflow_presentation import validate_presentation
from app.services.workflow_validation import InvalidWorkflowError, WorkflowSchemaResolver
from app.services.workflows import (
    execution_context,
    get_workflow,
    read_workflow,
    save_graph,
    validate_draft,
)


class AlignmentEditingService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings
        self.engine = AlignmentReportService(session, storage, settings)

    def _load(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID
    ) -> tuple[Workflow, WorkflowRead, Visualization, AlignmentEditRead, AlignmentSuffix | None]:
        ProjectService(self.session).lock(project_id)
        visual = IndependentVisualizationService(self.session).get(visualization_id)
        if visual.project_id != project_id:
            raise ApplicationError("VISUALIZATION_NOT_FOUND", "Visualization does not exist.", 404)
        workflow = get_workflow(self.session, visual.workflow_id)
        saved = read_workflow(self.session, workflow)
        self.session.scalar(
            select(Visualization).where(Visualization.id == visual.id).with_for_update()
        )
        catalog = saved.result_catalog or ResultCatalog()
        output = next((o for o in catalog.outputs if o.id == visual.publication_id), None)
        suffix = recognize_alignment(saved, output) if output else None
        widgets = list(
            self.session.scalars(
                select(DashboardWidget).where(DashboardWidget.visualization_id == visual.id)
            )
        )
        others = list(
            self.session.scalars(
                select(Visualization).where(
                    Visualization.workflow_id == workflow.id, Visualization.id != visual.id
                )
            )
        )
        view = AlignmentEditRead(
            workflow_id=workflow.id,
            visualization_id=visual.id,
            name=visual.name,
            expected_token=state_token(self.session, project_id),
            widget_count=len(widgets),
            steps=[ReportStep(node_id=n.id, type=n.type) for n in saved.nodes],
        )
        if not suffix or not output or visual.type != "table":
            view.reason = "This calculation is an advanced step. Edit it in the graph."
        elif (
            output.context_ids
            or output.measures
            or any(p.node_id in suffix.owned for c in catalog.contexts for p in c.points)
        ):
            view.reason = (
                "This report has view-context bindings. Edit its calculation in the graph."
            )
        elif any(presentation_references(saved, n) for n in suffix.owned):
            view.reason = "This calculation is an advanced step. Edit it in the graph."
        elif (
            any(
                e.source_node_id in suffix.owned and e.target_node_id not in suffix.owned
                for e in saved.edges
            )
            or any(o.id != output.id and o.node_id in suffix.owned for o in catalog.outputs)
            or any(
                v.publication_id == output.id or v.source_node_id in suffix.owned for v in others
            )
        ):
            view.reason = "This calculation is shared by other results. Edit it in the graph."
        elif any(w.config.get("action") or w.config.get("highlight_only") for w in widgets):
            view.reason = (
                "This report has interactive field bindings. Edit its calculation in the graph."
            )
        else:
            try:
                config = VisualizationConfig.model_validate(visual.config)
                if config.spec or set(visual.config) - set(VisualizationConfig.model_fields):
                    raise ValueError("Unknown visualization configuration")
                context = execution_context(
                    workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
                )
                plan = ExecutionPlanner(get_node_registry()).plan(
                    as_graph(saved, workflow.id, project_id), output.node_id
                )
                resolved = WorkflowSchemaResolver(get_node_registry()).resolve(plan.graph, context)
                if any(i.severity == "error" for i in resolved.issues):
                    raise ValueError("Invalid upstream schema")
                for side in ("left", "right"):
                    edge = getattr(suffix, side)
                    schema = (
                        next(n for n in resolved.nodes if n.node_id == edge.source_node_id)
                        .outputs[edge.source_port]
                        .table
                    )
                    if schema is None:
                        raise ValueError("Unavailable input schema")
                    setattr(
                        view,
                        f"{side}_columns",
                        [ResolvedColumnRead(**c.to_dict()) for c in schema.columns],
                    )
                view.settings = suffix.settings(visual.name)
                view.steps = [
                    ReportStep(
                        node_id=i,
                        type=next(n.type for n in saved.nodes if n.id == i),
                        editable=i in suffix.owned,
                    )
                    for i in plan.ordered_node_ids
                ]
                view.editable = True
            except (ValueError, InvalidWorkflowError, KeyError, StopIteration):
                view.reason = (
                    "Configure the upstream calculation in the graph before using the wizard."
                )
        return workflow, saved, visual, view, suffix

    def read(self, project_id: uuid.UUID, visualization_id: uuid.UUID) -> AlignmentEditRead:
        return self._load(project_id, visualization_id)[3]

    def _prepare(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID, request: AlignmentEditRequest
    ) -> tuple[Workflow, Visualization, WorkflowSave, AlignmentSuffix]:
        workflow, saved, visual, view, suffix = self._load(project_id, visualization_id)
        if request.expected_token != view.expected_token:
            raise ApplicationError(
                "REPORT_EDIT_CONFLICT",
                "The project changed. Reload the report before saving your changes.",
                409,
            )
        if not view.editable or suffix is None:
            raise ApplicationError(
                "REPORT_ADVANCED", view.reason or "Edit this calculation in the graph.", 409
            )
        if view.widget_count > 1 and not request.acknowledge_shared:
            raise ApplicationError(
                "REPORT_SHARED", "Confirm updating all widgets that use this visualization.", 409
            )
        assert visual.publication_id
        graph = patch_alignment(
            saved, suffix, request.settings, visual.publication_id, request.request_id
        )
        validate_draft(graph, get_node_registry())
        if graph.presentation:
            validate_presentation(graph.presentation, graph, get_node_registry())
        return workflow, visual, graph, suffix

    def fields(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID, request: AlignmentEditRequest
    ) -> AlignmentReportFields:
        workflow, _, graph, suffix = self._prepare(project_id, visualization_id, request)
        return self.engine.fields_graph(
            workflow, graph, suffix.node.id, [f.node_id for f in request.settings.formulas]
        )

    def _preview(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID, request: AlignmentEditRequest
    ) -> tuple[Workflow, Visualization, AlignmentReportPreview, dict[str, Any]]:
        workflow, visual, graph, suffix = self._prepare(project_id, visualization_id, request)
        formula_ids = [f.node_id for f in request.settings.formulas]
        fields = self.engine.fields_graph(workflow, graph, suffix.node.id, formula_ids)
        old_ids = [
            f"align_{suffix.node.id.hex}_key_{k['left_key']}" for k in suffix.node.config["keys"]
        ]
        old_ids += [
            f"align_{suffix.node.id.hex}_{side}_{role}"
            for role in ("value", "present")
            for side in ("left", "right")
        ]
        old_ids += [f"calc_{n.id.hex}" for n in suffix.formulas]
        columns = fields.formula_outputs[str(formula_ids[-1])] if formula_ids else fields.columns
        if old_ids != [c.column_id for c in columns] and not request.rebind_fields:
            raise ApplicationError(
                "INVALID_ALIGNMENT_REPORT",
                "Confirm updating table fields after changing grouping or measures.",
            )
        updates: dict[str, Any] = {}
        config = VisualizationConfig.model_validate(visual.config)
        if request.rebind_fields:
            key_count = len(request.settings.alignment.keys)
            updates.update(
                column_ids=[c.column_id for c in columns],
                grain_column_ids=[c.column_id for c in fields.columns[:key_count]],
                value_column_id=fields.columns[key_count].column_id,
                measure_column_ids=[c.column_id for c in fields.columns[key_count : key_count + 2]],
            )
        if config.title == visual.name and not config.title_template:
            updates["title"] = request.settings.name
        config = VisualizationConfig.model_validate({**visual.config, **updates})
        required = {
            *config.column_formats,
            *config.context_column_ids,
            *([config.highlight_column_id] if config.highlight_column_id else []),
            *([config.category_column_id] if config.category_column_id else []),
            *(s.column_id for s in config.additional_series),
        }
        if required - {c.column_id for c in columns}:
            raise ApplicationError(
                "INVALID_ALIGNMENT_REPORT",
                "Review visualization formatting and field bindings before removing these fields.",
            )
        preview = self.engine.preview_graph(
            workflow, graph, suffix.node.id, formula_ids, visual.id, request.settings.name, config
        )
        return workflow, visual, preview, updates

    def preview(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID, request: AlignmentEditRequest
    ) -> AlignmentReportPreview:
        return self._preview(project_id, visualization_id, request)[2]

    def apply(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID, request: AlignmentEditRequest
    ) -> ReportEditResult:
        ProjectService(self.session).lock(project_id)
        fingerprint = hashlib.sha256(
            json.dumps(
                {"visualization_id": str(visualization_id), **request.model_dump(mode="json")},
                sort_keys=True,
            ).encode()
        ).hexdigest()
        receipt = self.session.get(ReportDocument, request.request_id)
        if receipt:
            if (
                receipt.project_id != project_id
                or receipt.kind != "alignment_edit_receipt"
                or receipt.payload.get("fingerprint") != fingerprint
            ):
                raise ApplicationError(
                    "REPORT_EDIT_CONFLICT",
                    "This request identity was used for different report settings.",
                    409,
                )
            if self.session.get(Visualization, visualization_id) is None:
                raise ApplicationError(
                    "REPORT_RESULT_DELETED",
                    "The saved report was deleted. It will not be recreated by retrying.",
                    410,
                )
            return ReportEditResult.model_validate(receipt.payload["result"])
        try:
            workflow, visual, preview, updates = self._preview(
                project_id, visualization_id, request
            )
            save_graph(self.session, workflow, preview.graph, get_node_registry(), commit=False)
            assert preview.graph.result_catalog
            visual.source_node_id = next(
                o.node_id
                for o in preview.graph.result_catalog.outputs
                if o.id == visual.publication_id
            )
            visual.config = {**visual.config, **updates}
            visual.name, visual.revision = request.settings.name, visual.revision + 1
            result = ReportEditResult(
                workflow_id=workflow.id,
                visualization_id=visual.id,
                workflow_revision=workflow.revision,
                visualization_revision=visual.revision,
                dashboard_id=self.session.scalar(
                    select(DashboardWidget.dashboard_id)
                    .where(DashboardWidget.visualization_id == visual.id)
                    .order_by(DashboardWidget.id)
                    .limit(1)
                ),
            )
            self.session.add(
                ReportDocument(
                    id=request.request_id,
                    project_id=project_id,
                    kind="alignment_edit_receipt",
                    status="applied",
                    payload={"fingerprint": fingerprint, "result": result.model_dump(mode="json")},
                )
            )
            self.session.commit()
            return result
        except Exception:
            self.session.rollback()
            raise
