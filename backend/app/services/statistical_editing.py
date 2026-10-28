"""Revision-guarded editing of recognized terminal analyses; never a saved recipe."""

import hashlib
import json
import uuid
from typing import Any

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.publications import ResultCatalog
from app.domain.visualization_specs import AnalyticalTableSpec, HierarchySpec
from app.domain.visualizations import VisualizationConfig
from app.infrastructure.storage import StorageProvider
from app.models import DashboardWidget, ReportDocument, Visualization, Workflow
from app.nodes import get_node_registry
from app.schemas.report_builder import ReportEditResult, ReportStep
from app.schemas.statistical_reports import (
    AnalysisSettings,
    StatisticalEditRead,
    StatisticalEditRequest,
    StatisticalReportPreview,
    StatisticalSettings,
)
from app.schemas.workflows import ResolvedColumnRead, WorkflowRead
from app.services.analytical_tables import suggested_analytical_spec
from app.services.execution import ExecutionPlanner, InMemoryExecutionCache
from app.services.hierarchy_visualizations import suggested_hierarchy_spec, validate_hierarchy
from app.services.independent_visualizations import IndependentVisualizationService
from app.services.projects import ProjectService
from app.services.report_projection import as_graph, presentation_references
from app.services.source_updates import state_token
from app.services.statistical_projection import (
    ANALYSIS_TYPES,
    StatisticalSuffix,
    patch_statistics,
    recognize_statistics,
)
from app.services.statistical_reports import preview_statistics
from app.services.workflow_validation import InvalidWorkflowError, WorkflowSchemaResolver
from app.services.workflows import execution_context, get_workflow, read_workflow, save_graph


class StatisticalEditingService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings

    def _load(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID
    ) -> tuple[
        Workflow, WorkflowRead, Visualization, StatisticalEditRead, StatisticalSuffix | None
    ]:
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
        widgets = list(
            self.session.scalars(
                select(DashboardWidget).where(DashboardWidget.visualization_id == visual.id)
            )
        )
        view = StatisticalEditRead(
            workflow_id=workflow.id,
            visualization_id=visual.id,
            name=visual.name,
            expected_token=state_token(self.session, project_id),
            editable=False,
            widget_count=len(widgets),
            steps=[ReportStep(node_id=n.id, type=n.type) for n in saved.nodes],
        )
        suffix = recognize_statistics(saved, output) if output else None
        other = list(
            self.session.scalars(
                select(Visualization).where(
                    Visualization.workflow_id == workflow.id,
                    Visualization.id != visual.id,
                )
            )
        )
        # A separately consumed filter belongs to upstream preparation, not to this editor.
        if suffix and suffix.filter and any(v.source_node_id == suffix.filter.id for v in other):
            suffix = StatisticalSuffix(suffix.node, suffix.input_edge)
        if not output or output.kind != "dataset" or output.port != "dataset" or not suffix:
            view.reason = "This calculation is an advanced step. Edit it in the graph."
        elif visual.type != ANALYSIS_TYPES[suffix.node.type] and not (
            suffix.node.type == "table_rollup"
            and visual.type in {"treemap_chart", "sunburst_chart"}
        ):
            view.reason = "This presentation is configured in the graph and visualization settings."
        elif visual.type in {"treemap_chart", "sunburst_chart"} and (
            len(suffix.node.config.get("measures", [])) != 1
            or not suffix.node.config.get("subtotals", True)
            or not suffix.node.config.get("grand_total", True)
        ):
            view.reason = (
                "This hierarchy contains advanced rollup settings. "
                "Edit its calculation in the graph."
            )
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
            or any(v.publication_id == output.id or v.source_node_id in suffix.owned for v in other)
        ):
            view.reason = "This calculation is shared by other results. Edit it in the graph."
        elif (
            any(w.config.get("action") or w.config.get("highlight_only") for w in widgets)
            or visual.config.get("grain_column_ids") is not None
        ):
            view.reason = (
                "This report has interactive field bindings. Edit its calculation in the graph."
            )
        else:
            try:
                config = VisualizationConfig.model_validate(visual.config)
                if (
                    set(visual.config) - set(VisualizationConfig.model_fields)
                    or config.spec is None
                ):
                    raise ValueError("Unknown visualization configuration")
                view.settings = StatisticalSettings(
                    name=visual.name,
                    analysis=TypeAdapter(AnalysisSettings).validate_python(
                        {
                            **suffix.node.config,
                            **(
                                {"order_column_id": suffix.node.config.get("order_column_id")}
                                if suffix.node.type == "waterfall_steps"
                                else {}
                            ),
                            "type": visual.type
                            if isinstance(config.spec, HierarchySpec)
                            else suffix.node.type,
                        }
                    ),
                    filters=suffix.filter.config["conditions"] if suffix.filter else [],
                )
                context = execution_context(
                    workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
                )
                graph = as_graph(saved, workflow.id, project_id)
                # Existing advanced/multi-measure rollups are not simplified by the wizard.
                # Invalid saved bindings must be repaired explicitly before calculation editing.
                validate_hierarchy(visual.type, config, graph, output, catalog)
                plan = ExecutionPlanner(get_node_registry()).plan(
                    graph, suffix.upstream.source_node_id
                )
                resolved = WorkflowSchemaResolver(get_node_registry()).resolve(plan.graph, context)
                result = next(
                    n for n in resolved.nodes if n.node_id == suffix.upstream.source_node_id
                )
                upstream = (
                    result.outputs.get(suffix.upstream.source_port) if result.outputs else None
                )
                if upstream is None or upstream.table is None:
                    raise ValueError("Unavailable upstream schema")
                view.columns = [ResolvedColumnRead(**c.to_dict()) for c in upstream.table.columns]
                plan = ExecutionPlanner(get_node_registry()).plan(graph, suffix.node.id)
                view.steps = [
                    ReportStep(
                        node_id=i,
                        type=next(n.type for n in saved.nodes if n.id == i),
                        editable=i in suffix.owned,
                    )
                    for i in plan.ordered_node_ids
                ]
                view.editable = True
            except (ValueError, InvalidWorkflowError):
                view.reason = (
                    "Configure the upstream calculation in the graph before using the wizard."
                )
        return workflow, saved, visual, view, suffix

    def read(self, project_id: uuid.UUID, visualization_id: uuid.UUID) -> StatisticalEditRead:
        return self._load(project_id, visualization_id)[3]

    def _prepare(
        self,
        project_id: uuid.UUID,
        visualization_id: uuid.UUID,
        request: StatisticalEditRequest,
        offset: int = 0,
    ) -> tuple[Workflow, Visualization, StatisticalReportPreview, VisualizationConfig]:
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
        assert view.settings is not None
        if request.settings.analysis.type != view.settings.analysis.type:
            raise ApplicationError(
                "INVALID_STATISTICAL_REPORT",
                "Keep the analysis type when editing; "
                "create a separate report for another analysis.",
            )
        if any(
            c.parameter is not None
            or (c.value is not None and type(c.value) not in (str, bool, int, float))
            for c in request.settings.filters
        ):
            raise ApplicationError(
                "INVALID_REPORT", "Parameterized filters remain advanced steps in the graph."
            )
        payload = patch_statistics(saved, suffix, request.settings, request.request_id)
        config = VisualizationConfig.model_validate(visual.config)
        if isinstance(config.spec, HierarchySpec):
            assert payload.result_catalog
            output = next(
                o for o in payload.result_catalog.outputs if o.id == visual.publication_id
            )
            hierarchy = suggested_hierarchy_spec(
                as_graph(payload, workflow.id, project_id), output, config.spec.type
            )
            assert hierarchy
            if (
                config.spec.dimensions != hierarchy.dimensions
                or config.spec.value_column_id != hierarchy.value_column_id
            ):
                if not request.rebind_fields:
                    raise ApplicationError(
                        "INVALID_STATISTICAL_REPORT",
                        "Confirm updating hierarchy fields after changing grouping or measures.",
                    )
                config.spec = hierarchy
        if isinstance(config.spec, AnalyticalTableSpec):
            assert payload.result_catalog
            output = next(
                o for o in payload.result_catalog.outputs if o.id == visual.publication_id
            )
            expected = suggested_analytical_spec(as_graph(payload, workflow.id, project_id), output)
            assert expected
            if config.spec.dimensions != expected.dimensions or set(config.spec.measures) != set(
                expected.measures
            ):
                if not request.rebind_fields:
                    raise ApplicationError(
                        "INVALID_STATISTICAL_REPORT",
                        "Confirm updating table fields after changing grouping or measures.",
                    )
                # Formatting/navigation references are deliberately not dropped. Validation below
                # rejects dangling bindings and tells the author to adjust appearance first.
                config.spec = config.spec.model_copy(
                    update={
                        "dimensions": expected.dimensions,
                        "measures": expected.measures,
                        "visible_measures": None
                        if config.spec.visible_measures is None
                        else [m for m in config.spec.visible_measures if m in expected.measures]
                        + [m for m in expected.measures if m not in config.spec.measures],
                        "pinned_columns": min(
                            config.spec.pinned_columns,
                            len(expected.dimensions) + len(expected.measures),
                        ),
                    }
                )
        if config.title == visual.name and not config.title_template:
            config.title = request.settings.name
        try:
            config = VisualizationConfig.model_validate(config.model_dump())
        except ValidationError as exc:
            raise ApplicationError(
                "INVALID_STATISTICAL_REPORT",
                "Review visualization formatting and field bindings before removing these fields.",
            ) from exc
        context = execution_context(
            workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
        )
        transient = Visualization(
            id=visual.id,
            project_id=project_id,
            workflow_id=workflow.id,
            source_node_id=visual.source_node_id,
            publication_id=visual.publication_id,
            name=request.settings.name,
            type=visual.type,
            revision=visual.revision,
            config=config.model_dump(mode="json"),
        )
        preview = preview_statistics(workflow, payload, transient, config, context, offset)
        required = {
            *config.column_formats,
            *config.context_column_ids,
            *([config.highlight_column_id] if config.highlight_column_id else []),
        }
        if required - {c.column_id for c in preview.result.columns}:
            raise ApplicationError(
                "INVALID_STATISTICAL_REPORT",
                "Review visualization formatting and field bindings before removing these fields.",
            )
        return workflow, visual, preview, config

    def preview(
        self,
        project_id: uuid.UUID,
        visualization_id: uuid.UUID,
        request: StatisticalEditRequest,
        offset: int = 0,
    ) -> StatisticalReportPreview:
        return self._prepare(project_id, visualization_id, request, offset)[2]

    def apply(
        self, project_id: uuid.UUID, visualization_id: uuid.UUID, request: StatisticalEditRequest
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
                or receipt.kind != "statistical_edit_receipt"
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
            workflow, visual, preview, config = self._prepare(project_id, visualization_id, request)
            save_graph(self.session, workflow, preview.graph, get_node_registry(), commit=False)
            updates: dict[str, Any] = {"title": config.title}
            if request.rebind_fields and isinstance(config.spec, AnalyticalTableSpec):
                bindings = config.spec.model_dump(mode="json")
                updates["spec"] = {
                    **visual.config["spec"],
                    **{
                        key: bindings[key]
                        for key in ("dimensions", "measures", "visible_measures", "pinned_columns")
                    },
                }
            elif request.rebind_fields and isinstance(config.spec, HierarchySpec):
                updates["spec"] = config.spec.model_dump(mode="json")
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
                    kind="statistical_edit_receipt",
                    status="applied",
                    payload={"fingerprint": fingerprint, "result": result.model_dump(mode="json")},
                )
            )
            self.session.commit()
            return result
        except Exception:
            self.session.rollback()
            raise
