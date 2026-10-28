"""Analytical reports create normal graph branches and typed visualizations atomically."""

import hashlib
import json
import uuid

from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.funnel import funnel_spec
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualization_specs import (
    box_plot_spec,
    heatmap_spec,
    histogram_spec,
    pareto_spec,
    waterfall_spec,
)
from app.domain.visualizations import VisualizationConfig
from app.infrastructure.storage import StorageProvider
from app.models import Dashboard, DashboardWidget, ReportDocument, Visualization, Workflow
from app.nodes import get_node_registry
from app.schemas.report_builder import ReportBuildResult
from app.schemas.statistical_reports import StatisticalReportPreview, StatisticalReportRequest
from app.schemas.workflows import (
    EdgePayload,
    NodePayload,
    PositionPayload,
    WorkflowRead,
    WorkflowSave,
)
from app.services.analytical_tables import (
    render_analytical_table,
    suggested_analytical_spec,
    validate_analytical_table,
)
from app.services.box_plot_visualizations import render_box_plot, validate_box_plot
from app.services.execution import (
    ExecutionFailure,
    ExecutionPlanner,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)
from app.services.funnel_visualizations import render_funnel, validate_funnel
from app.services.heatmap_visualizations import render_heatmap, validate_heatmap
from app.services.hierarchy_visualizations import (
    render_hierarchy,
    suggested_hierarchy_spec,
    validate_hierarchy,
)
from app.services.histogram_visualizations import render_histogram, validate_histogram
from app.services.pareto_visualizations import render_pareto, validate_pareto
from app.services.projects import ProjectService
from app.services.report_builder import build_ids
from app.services.report_inputs import ReportInputService
from app.services.report_projection import as_graph
from app.services.waterfall_visualizations import render_waterfall, validate_waterfall
from app.services.workflow_presentation import validate_presentation
from app.services.workflows import execution_context, get_workflow, save_graph, validate_draft


def compile_statistics(
    request: StatisticalReportRequest,
    saved: WorkflowRead | None,
    upstream: PublishedOutput | None,
) -> WorkflowSave:
    identity = build_ids(request)
    nodes = (
        []
        if saved
        else [
            NodePayload(
                id=uuid.uuid5(request.request_id, "source"),
                type="dataset_source",
                version=1,
                position=PositionPayload(x=40, y=80),
                config={"source_id": str(request.source_id), "resource_id": request.resource_id},
            )
        ]
    )
    if request.filters:
        nodes.append(
            NodePayload(
                id=uuid.uuid5(request.request_id, "filter"),
                type="filter",
                version=1,
                position=PositionPayload(x=0, y=0),
                config={"conditions": [f.model_dump(mode="json") for f in request.filters]},
            )
        )
    nodes.append(
        NodePayload(
            id=uuid.uuid5(request.request_id, "statistics"),
            type="table_rollup"
            if request.analysis.type in {"treemap_chart", "sunburst_chart"}
            else request.analysis.type,
            version=1,
            position=PositionPayload(x=0, y=0),
            config=request.analysis.model_dump(mode="json", exclude={"type"}),
        )
    )
    row = max((n.position.y for n in saved.nodes), default=0) + 320 if saved else 80
    for index, node in enumerate(nodes):
        node.position = PositionPayload(x=40 + index * 360, y=row)
    edges = [
        EdgePayload(
            id=uuid.uuid5(request.request_id, f"statistics-edge-{index}"),
            source_node_id=left.id,
            source_port="dataset",
            target_node_id=right.id,
            target_port="input",
        )
        for index, (left, right) in enumerate(zip(nodes, nodes[1:], strict=False))
    ]
    if upstream:
        edges.insert(
            0,
            EdgePayload(
                id=uuid.uuid5(request.request_id, "statistics-input"),
                source_node_id=upstream.node_id,
                source_port=upstream.port,
                target_node_id=nodes[0].id,
                target_port="input",
            ),
        )
    catalog = (
        saved.result_catalog.model_copy(deep=True)
        if saved and saved.result_catalog
        else ResultCatalog()
    )
    catalog.outputs.append(
        PublishedOutput(
            id=identity.publication_id,
            node_id=nodes[-1].id,
            port="dataset",
            kind="dataset",
            name=request.name,
        )
    )
    return WorkflowSave(
        name=saved.name if saved else request.name,
        expected_revision=saved.revision if saved else 1,
        format_version=3,
        nodes=[*(saved.nodes if saved else []), *nodes],
        edges=[*(saved.edges if saved else []), *edges],
        parameters=saved.parameters if saved else None,
        presentation=saved.presentation if saved else None,
        result_catalog=catalog,
    )


def statistical_config(
    request: StatisticalReportRequest, graph: WorkflowSave, project_id: uuid.UUID
) -> VisualizationConfig:
    node_id = uuid.uuid5(request.request_id, "statistics")
    if request.analysis.type in {"treemap_chart", "sunburst_chart"}:
        assert graph.result_catalog is not None
        hierarchy = suggested_hierarchy_spec(
            as_graph(graph, build_ids(request).workflow_id, project_id),
            graph.result_catalog.outputs[-1],
            "treemap_chart" if request.analysis.type == "treemap_chart" else "sunburst_chart",
        )
        assert hierarchy is not None
        return VisualizationConfig(title=request.name, spec=hierarchy)
    if request.analysis.type == "table_rollup":
        assert graph.result_catalog is not None
        spec = suggested_analytical_spec(
            as_graph(graph, build_ids(request).workflow_id, project_id),
            graph.result_catalog.outputs[-1],
        )
        assert spec is not None
        return VisualizationConfig(title=request.name, spec=spec)
    return VisualizationConfig(
        title=request.name,
        spec=(
            waterfall_spec(node_id)
            if request.analysis.type == "waterfall_steps"
            else pareto_spec(node_id)
            if request.analysis.type == "pareto"
            else funnel_spec(node_id)
            if request.analysis.type == "funnel_steps"
            else histogram_spec(node_id)
            if request.analysis.type == "histogram"
            else heatmap_spec(node_id)
            if request.analysis.type == "heatmap_stats"
            else box_plot_spec(node_id)
        ),
    )


class StatisticalReportService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings

    def preview(
        self,
        project_id: uuid.UUID,
        request: StatisticalReportRequest,
        offset: int = 0,
    ) -> StatisticalReportPreview:
        workflow, saved, upstream = ReportInputService(
            self.session, self.storage, self.settings
        ).resolve(project_id, request, request.name)
        payload = compile_statistics(request, saved, upstream)
        identity = build_ids(request)
        context = execution_context(
            workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
        )
        config = statistical_config(request, payload, project_id)
        assert config.spec is not None and payload.result_catalog is not None
        visual = Visualization(
            id=identity.visualization_id,
            project_id=project_id,
            workflow_id=workflow.id,
            source_node_id=payload.nodes[-1].id,
            publication_id=identity.publication_id,
            name=request.name,
            type=config.spec.type,
            revision=1,
            config=config.model_dump(mode="json"),
        )
        return preview_statistics(workflow, payload, visual, config, context, offset)

    def apply(self, project_id: uuid.UUID, request: StatisticalReportRequest) -> ReportBuildResult:
        ProjectService(self.session).lock(project_id)
        fingerprint = hashlib.sha256(
            json.dumps(request.model_dump(mode="json"), sort_keys=True).encode()
        ).hexdigest()
        receipt = self.session.get(ReportDocument, request.request_id)
        if receipt:
            if (
                receipt.project_id != project_id
                or receipt.kind != "statistical_report_receipt"
                or receipt.payload.get("fingerprint") != fingerprint
            ):
                raise ApplicationError(
                    "REPORT_CONFLICT",
                    "This request identity was used for different report settings.",
                    409,
                )
            identity = ReportBuildResult.model_validate(receipt.payload["result"])
            if (
                self.session.get(Visualization, identity.visualization_id) is None
                or self.session.get(Dashboard, identity.dashboard_id) is None
            ):
                raise ApplicationError(
                    "REPORT_RESULT_DELETED",
                    "The saved report was deleted. It will not be recreated by retrying.",
                    410,
                )
            return identity
        preview = self.preview(project_id, request)
        identity = build_ids(request)
        config = statistical_config(request, preview.graph, project_id)
        assert config.spec is not None
        try:
            if request.published_input:
                workflow = get_workflow(self.session, identity.workflow_id)
            else:
                workflow = Workflow(
                    id=identity.workflow_id, project_id=project_id, name=request.name
                )
                self.session.add(workflow)
                self.session.flush()
            save_graph(self.session, workflow, preview.graph, get_node_registry(), commit=False)
            self.session.add(
                Visualization(
                    id=identity.visualization_id,
                    project_id=project_id,
                    workflow_id=workflow.id,
                    source_node_id=preview.graph.nodes[-1].id,
                    publication_id=identity.publication_id,
                    name=request.name,
                    type=config.spec.type,
                    config=config.model_dump(mode="json"),
                )
            )
            self.session.add(
                Dashboard(id=identity.dashboard_id, project_id=project_id, name=request.name)
            )
            self.session.flush()
            self.session.add(
                DashboardWidget(
                    id=uuid.uuid5(request.request_id, "statistical-widget"),
                    dashboard_id=identity.dashboard_id,
                    visualization_id=identity.visualization_id,
                    title=request.name,
                    config={},
                    position_x=0,
                    position_y=0,
                    width=12,
                    height=10,
                )
            )
            self.session.add(
                ReportDocument(
                    id=request.request_id,
                    project_id=project_id,
                    kind="statistical_report_receipt",
                    status="applied",
                    payload={
                        "fingerprint": fingerprint,
                        "result": identity.model_dump(mode="json"),
                    },
                )
            )
            self.session.commit()
            return identity
        except Exception:
            self.session.rollback()
            raise


def preview_statistics(
    workflow: Workflow,
    payload: WorkflowSave,
    visual: Visualization,
    config: VisualizationConfig,
    context: ExecutionContext,
    offset: int = 0,
) -> StatisticalReportPreview:
    registry = get_node_registry()
    validate_draft(payload, registry)
    if payload.presentation:
        validate_presentation(payload.presentation, payload, registry)
    graph = as_graph(payload, workflow.id, workflow.project_id)
    assert payload.result_catalog is not None
    output = next(o for o in payload.result_catalog.outputs if o.id == visual.publication_id)
    try:
        validate_box_plot(visual.type, config, graph, output, payload.result_catalog)
        validate_histogram(visual.type, config, graph, output, payload.result_catalog)
        validate_heatmap(visual.type, config, graph, output, payload.result_catalog)
        validate_analytical_table(visual.type, config, graph, output, payload.result_catalog)
        validate_pareto(visual.type, config, graph, output, payload.result_catalog)
        validate_funnel(visual.type, config, graph, output, payload.result_catalog)
        validate_hierarchy(visual.type, config, graph, output, payload.result_catalog)
        validate_waterfall(visual.type, config, graph, output, payload.result_catalog)
        executed = WorkflowExecutionService(registry).execute(graph, output.node_id, context)
        if visual.type == "waterfall_chart":
            result = render_waterfall(visual, workflow, config, executed, context, [], [])
        elif visual.type == "pareto_chart":
            result = render_pareto(
                visual, workflow, config, executed, context, [], [], offset, 100, False
            )
        elif visual.type == "funnel_chart":
            result = render_funnel(visual, workflow, config, executed, context, [], [])
        elif visual.type in {"treemap_chart", "sunburst_chart"}:
            result = render_hierarchy(visual, workflow, config, executed, context, [], [])
        elif visual.type == "histogram_chart":
            result = render_histogram(visual, workflow, config, executed, context, [], [])
        elif visual.type == "heatmap_chart":
            result = render_heatmap(visual, workflow, config, executed, context, [], [])
        elif visual.type == "analytical_table":
            result = render_analytical_table(
                visual, workflow, config, executed, context, [], [], offset, 100, False
            )
        else:
            result = render_box_plot(
                visual, workflow, config, executed, context, [], [], offset, 100, False
            )
    except ExecutionFailure as exc:
        raise ApplicationError(
            "INVALID_STATISTICAL_REPORT",
            exc.issues[0].message if exc.issues else exc.message,
            node_id=str(exc.node_id) if exc.node_id else None,
            issues=[{"code": i.code, "field": i.field, "message": i.message} for i in exc.issues],
        ) from exc
    except ValueError as exc:
        raise ApplicationError("INVALID_STATISTICAL_REPORT", str(exc)) from exc
    return StatisticalReportPreview(
        graph=payload,
        result=result,
        steps=[
            next(n.type for n in payload.nodes if n.id == node_id)
            for node_id in ExecutionPlanner(registry).plan(graph, output.node_id).ordered_node_ids
        ],
    )
