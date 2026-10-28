"""Revision-checked edits project the current DAG; receipts never store a second recipe."""

import hashlib
import json
import uuid
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError, NodeExecutionError
from app.domain.publications import ResultCatalog
from app.domain.visualizations import VisualizationConfig
from app.infrastructure.storage import StorageProvider
from app.models import DashboardWidget, ReportDocument, Visualization, Workflow
from app.nodes import get_node_registry
from app.nodes.exact_group_by import ExactGroupByConfig
from app.nodes.filter import FilterConfig
from app.nodes.stable_group_by import StableGroupByConfig
from app.schemas.report_builder import (
    ReportBuildPreview,
    ReportComparison,
    ReportEditRead,
    ReportEditRequest,
    ReportEditResult,
    ReportEditSettings,
    ReportFormula,
    ReportFormulaFields,
    ReportStep,
)
from app.schemas.workflows import ResolvedColumnRead, WorkflowRead
from app.services.alignment_projection import recognize_alignment
from app.services.execution import (
    ExecutionFailure,
    ExecutionPlanner,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)
from app.services.independent_visualizations import IndependentVisualizationService
from app.services.normalization import transport_rows
from app.services.projects import ProjectService
from app.services.report_builder import visualization_config
from app.services.report_formulas import formula_fields, receipt_payload
from app.services.report_projection import (
    EditableSuffix,
    as_graph,
    patch_suffix,
    presentation_references,
    recognize,
)
from app.services.report_visualizations import preview_report_visualization
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


class ReportEditingService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings

    @staticmethod
    def check_comparison_settings(suffix: EditableSuffix, settings: ReportEditSettings) -> None:
        if suffix.comparison and "comparison" not in settings.model_fields_set:
            raise ApplicationError(
                "REPORT_EDIT_CONFLICT",
                "Reload comparison settings before editing this report.",
                409,
            )

    def _load(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID
    ) -> tuple[Workflow, WorkflowRead, Visualization, ReportEditRead, EditableSuffix | None]:
        ProjectService(self.session).lock(project_id)
        visual = IndependentVisualizationService(self.session).get(visualization_id)
        if visual.project_id != project_id:
            raise ApplicationError("VISUALIZATION_NOT_FOUND", "Visualization does not exist.", 404)
        workflow = get_workflow(self.session, visual.workflow_id)
        saved = read_workflow(self.session, workflow)
        # Dashboard saves lock their visualizations for shared use, not the project.
        # Lock after the workflow read to follow workflow deletion's FK lock order.
        self.session.scalar(
            select(Visualization).where(Visualization.id == visual.id).with_for_update()
        )
        catalog = saved.result_catalog or ResultCatalog()
        published = next((o for o in catalog.outputs if o.id == visual.publication_id), None)
        widgets = list(
            self.session.scalars(
                select(DashboardWidget).where(DashboardWidget.visualization_id == visual.id)
            )
        )
        view = ReportEditRead(
            workflow_id=workflow.id,
            visualization_id=visual.id,
            name=visual.name,
            expected_token=state_token(self.session, project_id),
            editable=False,
            widget_count=len(widgets),
            analytical_editor=visual.type
            in {"histogram_chart", "box_plot", "heatmap_chart", "analytical_table"},
            steps=[ReportStep(node_id=n.id, type=n.type) for n in saved.nodes],
        )
        suffix = recognize(saved, published) if published else None
        view.alignment_editor = bool(published and recognize_alignment(saved, published))
        if (
            not published
            or published.kind != "dataset"
            or published.port != "dataset"
            or suffix is None
        ):
            view.reason = "This calculation is an advanced step. Edit it in the graph."
        elif visual.config.get("grain_column_ids") is not None:
            view.reason = "This report reuses a named measure. Edit its calculation in the graph."
        elif published.context_ids or any(
            p.node_id in suffix.owned for c in catalog.contexts for p in c.points
        ):
            view.reason = (
                "This report has view-context bindings. Edit its calculation in the graph."
            )
        elif any(
            presentation_references(saved, n.id)
            for n in [
                *suffix.summaries,
                *([suffix.calendar] if suffix.calendar else []),
                *([suffix.comparison] if suffix.comparison else []),
            ]
        ):
            view.reason = "This calculation is an advanced step. Edit it in the graph."
        elif (
            any(
                e.source_node_id in suffix.owned and e.target_node_id not in suffix.owned
                for e in saved.edges
            )
            or any(o.id != published.id and o.node_id in suffix.owned for o in catalog.outputs)
            or self.session.scalar(
                select(Visualization.id)
                .where(
                    Visualization.workflow_id == workflow.id,
                    Visualization.id != visual.id,
                    (Visualization.publication_id == published.id)
                    | (Visualization.source_node_id.in_(suffix.owned)),
                )
                .limit(1)
            )
        ):
            view.reason = "This calculation is shared by other results. Edit it in the graph."
        elif any(w.config.get("action") or w.config.get("highlight_only") for w in widgets):
            view.reason = (
                "This report has interactive field bindings. Edit its calculation in the graph."
            )
        elif visual.type not in {
            "table",
            "bar_chart",
            "line_chart",
            "kpi",
            "combo_chart",
            "radar_chart",
        }:
            view.reason = "This presentation is configured in the graph and visualization settings."
        else:
            try:
                aggregate = (
                    StableGroupByConfig if suffix.aggregate.version == 3 else ExactGroupByConfig
                ).model_validate(suffix.aggregate.config)
                view.settings = ReportEditSettings(
                    name=visual.name,
                    dimensions=aggregate.dimensions,
                    measures=[a.model_dump(mode="json") for a in aggregate.aggregations],
                    row_formulas=[ReportFormula(node_id=n.id, **n.config) for n in suffix.rows],
                    summary_formulas=[
                        ReportFormula(node_id=n.id, **n.config) for n in suffix.summaries
                    ],
                    value_field_id=visual.config.get("value_column_id"),
                    filters=FilterConfig.model_validate(suffix.filter.config).conditions
                    if suffix.filter
                    else [],
                    decimal_average_scale=aggregate.decimal_average_scale,
                    presentation=visual.type,
                    combo=visual.config.get("spec") if visual.type == "combo_chart" else None,
                    radar=visual.config.get("spec") if visual.type == "radar_chart" else None,
                    comparison=ReportComparison.model_validate(
                        {k: v for k, v in suffix.comparison.config.items() if k != "partitions"}
                    )
                    if suffix.comparison
                    else None,
                )
                view.editable = True
            except ValidationError:
                view.reason = (
                    "This calculation exceeds the simple editor limits. Edit it in the graph."
                )
        if suffix:
            try:
                plan = ExecutionPlanner(get_node_registry()).plan(
                    as_graph(saved, workflow.id, project_id), suffix.terminal.id
                )
                editable = suffix.owned
                nodes = {n.id: n for n in saved.nodes}
                view.steps = [
                    ReportStep(
                        node_id=i, type=nodes[i].type, editable=view.editable and i in editable
                    )
                    for i in plan.ordered_node_ids
                ]
            except InvalidWorkflowError:
                view.editable, view.reason = (
                    False,
                    "This calculation is an advanced step. Edit it in the graph.",
                )
        return workflow, saved, visual, view, suffix

    def read(self, project_id: uuid.UUID, visualization_id: uuid.UUID) -> ReportEditRead:
        workflow, saved, _, view, suffix = self._load(project_id, visualization_id)
        if view.editable and suffix:
            context = execution_context(
                workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
            )
            try:
                branch = (
                    ExecutionPlanner(get_node_registry())
                    .plan(as_graph(saved, workflow.id, project_id), suffix.upstream.source_node_id)
                    .graph
                )
                resolved = WorkflowSchemaResolver(get_node_registry()).resolve(branch, context)
                node = next(
                    (n for n in resolved.nodes if n.node_id == suffix.upstream.source_node_id), None
                )
                value = (
                    node.outputs.get(suffix.upstream.source_port) if node and node.outputs else None
                )
                if value is None or value.table is None:
                    raise ValueError("The upstream table is unavailable.")
                view.columns = [ResolvedColumnRead(**c.to_dict()) for c in value.table.columns]
            except (ValueError, InvalidWorkflowError):
                view.editable, view.reason = (
                    False,
                    "Configure the upstream calculation in the graph before using the wizard.",
                )
        return view

    def fields(
        self,
        project_id: uuid.UUID,
        visualization_id: uuid.UUID,
        request: ReportEditRequest,
        include_summary: bool = False,
    ) -> ReportFormulaFields:
        workflow, saved, _, view, suffix = self._load(project_id, visualization_id)
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
        self.check_comparison_settings(suffix, request.settings)
        payload = patch_suffix(
            saved,
            suffix,
            request.settings
            if include_summary
            else request.settings.model_copy(update={"summary_formulas": []}),
            request.request_id,
        )
        context = execution_context(
            workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
        )
        try:
            return formula_fields(
                payload,
                workflow,
                context,
                suffix.aggregate.id,
                [f.node_id for f in request.settings.summary_formulas] if include_summary else None,
            )
        except ValueError as exc:
            raise ApplicationError("INVALID_REPORT", str(exc)) from exc

    def _prepare(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID, request: ReportEditRequest
    ) -> tuple[Workflow, Visualization, ReportBuildPreview, VisualizationConfig]:
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
        settings = request.settings
        self.check_comparison_settings(suffix, settings)
        if bool(suffix.comparison) != bool(settings.comparison) and not settings.rebind_fields:
            raise ApplicationError(
                "INVALID_REPORT",
                "Enable updating visualization fields before adding or removing a comparison.",
            )
        if settings.presentation != visual.type and not settings.rebind_fields:
            raise ApplicationError(
                "INVALID_REPORT",
                "Enable updating visualization fields before changing presentation.",
            )
        if any(
            c.parameter is not None
            or (c.value is not None and type(c.value) not in (str, bool, int, float))
            for c in settings.filters
        ):
            raise ApplicationError(
                "INVALID_REPORT", "Parameterized filters remain advanced steps in the graph."
            )
        payload = patch_suffix(saved, suffix, settings, request.request_id)
        terminal = payload.nodes[-1].id
        validate_draft(payload, get_node_registry())
        if payload.presentation:
            validate_presentation(payload.presentation, payload, get_node_registry())
        context = execution_context(
            workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
        )
        try:
            graph = as_graph(payload, workflow.id, project_id)
            result = WorkflowExecutionService(get_node_registry()).execute(graph, terminal, context)
            columns = [ResolvedColumnRead(**c.to_dict()) for c in result.schema.columns]
            config = VisualizationConfig.model_validate(visual.config)
            # Unknown configuration fields must not disappear in a round-trip.
            if set(visual.config) - set(VisualizationConfig.model_fields):
                raise ValueError("This visualization has settings unsupported by this editor.")
            if (
                settings.presentation == "combo_chart"
                and not settings.rebind_fields
                and settings.combo != config.spec
            ):
                raise ValueError(
                    "Enable updating visualization fields before changing combination bindings."
                )
            if (
                settings.presentation == "radar_chart"
                and not settings.rebind_fields
                and settings.radar != config.spec
            ):
                raise ValueError(
                    "Enable updating visualization fields before changing radar bindings."
                )
            if settings.rebind_fields:
                if settings.presentation in {"bar_chart", "line_chart"} and (
                    len(settings.dimensions) != 1
                    or (
                        not settings.comparison
                        and len(settings.measures) + len(settings.summary_formulas) > 8
                    )
                ):
                    raise ValueError(
                        "Choose one dimension and up to eight measures, or use a table."
                    )
                if settings.presentation == "kpi" and (
                    settings.dimensions
                    or (
                        len(settings.measures) + len(settings.summary_formulas) != 1
                        and not settings.value_field_id
                    )
                ):
                    raise ValueError("Choose one measure for a KPI.")
                bindings = visualization_config(settings, columns, terminal)
                config = config.model_copy(
                    update={
                        key: getattr(bindings, key)
                        for key in (
                            "value_column_id",
                            "category_column_id",
                            "column_ids",
                            "additional_series",
                            "spec",
                        )
                    }
                )
                if settings.presentation == "combo_chart":
                    config.orientation = "vertical"
            if settings.comparison and settings.presentation in {"bar_chart", "line_chart"}:
                expected = visualization_config(settings, columns, terminal)
                if (
                    config.value_column_id != expected.value_column_id
                    or config.category_column_id != expected.category_column_id
                    or [s.column_id for s in config.additional_series]
                    != [s.column_id for s in expected.additional_series]
                ):
                    raise ValueError(
                        "Update visualization field bindings to display "
                        "the compared measure and its baseline."
                    )
            if config.title == visual.name and not config.title_template:
                config.title = settings.name
            required = {
                *config.column_formats,
                *config.context_column_ids,
                *([config.highlight_column_id] if config.highlight_column_id else []),
                *(s.column_id for s in config.additional_series),
            }
            if settings.presentation == "table":
                required.update(config.column_ids or [])
            else:
                required.update(i for i in [config.value_column_id, config.category_column_id] if i)
            if payload.presentation:
                required.update(
                    p.column_id
                    for block in payload.presentation.blocks
                    for p in block.outputs
                    if p.node_id == suffix.aggregate.id and p.column_id is not None
                )
            if required - {c.column_id for c in columns}:
                raise ValueError(
                    "Selected visualization fields are unavailable. "
                    "Update field bindings or review visualization settings."
                )
            visual_preview = preview_report_visualization(
                workflow,
                visual.id,
                settings.presentation,
                config,
                result,
                context,
            )
            plan = ExecutionPlanner(get_node_registry()).plan(graph, terminal)
            nodes = {n.id: n for n in graph.nodes}
            preview = ReportBuildPreview(
                visualization=visual_preview,
                graph=payload,
                columns=columns,
                rows=transport_rows(result.output.frame.head(50)),
                total_rows=result.output.row_count,
                steps=[nodes[i].type for i in plan.ordered_node_ids],
            )
            return workflow, visual, preview, config
        except ExecutionFailure as exc:
            raise ApplicationError(
                "INVALID_REPORT",
                exc.issues[0].message if exc.issues else exc.message,
                node_id=str(exc.node_id) if exc.node_id else None,
            ) from exc
        except (ValueError, NodeExecutionError) as exc:
            raise ApplicationError("INVALID_REPORT", str(exc)) from exc

    def preview_edit(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID, request: ReportEditRequest
    ) -> ReportBuildPreview:
        return self._prepare(project_id, visualization_id, request)[2]

    def apply_edit(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID, request: ReportEditRequest
    ) -> ReportEditResult:
        ProjectService(self.session).lock(project_id)
        fingerprint = hashlib.sha256(
            json.dumps(
                {"visualization_id": str(visualization_id), **receipt_payload(request)},
                sort_keys=True,
            ).encode()
        ).hexdigest()
        receipt = self.session.get(ReportDocument, request.request_id)
        if receipt:
            if (
                receipt.project_id != project_id
                or receipt.kind != "report_edit_receipt"
                or receipt.payload.get("fingerprint") != fingerprint
            ):
                raise ApplicationError(
                    "REPORT_EDIT_CONFLICT",
                    "This request identity was used for different report settings.",
                    409,
                )
            return ReportEditResult.model_validate(receipt.payload["result"])
        try:
            workflow, visual, preview, config = self._prepare(project_id, visualization_id, request)
            save_graph(self.session, workflow, preview.graph, get_node_registry(), commit=False)
            if preview.graph.result_catalog:
                visual.source_node_id = next(
                    o.node_id
                    for o in preview.graph.result_catalog.outputs
                    if o.id == visual.publication_id
                )
            visual.name, visual.type = request.settings.name, request.settings.presentation
            # Keep unedited nested appearance metadata byte-for-byte, including future keys.
            updates: dict[str, Any] = {"title": config.title}
            if request.settings.rebind_fields:
                rendered = config.model_dump(mode="json", exclude_none=False)
                updates.update(
                    {
                        key: rendered.get(key, [] if key == "additional_series" else None)
                        for key in (
                            "value_column_id",
                            "category_column_id",
                            "column_ids",
                            "additional_series",
                            "spec",
                            "orientation",
                        )
                    }
                )
            visual.config, visual.revision = {**visual.config, **updates}, visual.revision + 1
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
                    kind="report_edit_receipt",
                    status="applied",
                    payload={"fingerprint": fingerprint, "result": result.model_dump(mode="json")},
                )
            )
            self.session.commit()
            return result
        except Exception:
            self.session.rollback()
            raise
