"""A report wizard compiles ordinary graph nodes; only the graph owns calculations."""

import hashlib
import json
import uuid

from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualizations import AdditionalSeries, VisualizationConfig
from app.infrastructure.storage import StorageProvider
from app.models import (
    Dashboard,
    DashboardWidget,
    ReportDocument,
    Visualization,
    Workflow,
)
from app.nodes import get_node_registry
from app.schemas.report_builder import (
    ReportBuildPreview,
    ReportBuildRequest,
    ReportBuildResult,
    ReportFormulaFields,
    ReportSettings,
    ReportSourceRequest,
)
from app.schemas.workflows import (
    EdgePayload,
    NodePayload,
    PositionPayload,
    ResolvedColumnRead,
    WorkflowRead,
    WorkflowSave,
)
from app.services.execution import (
    ExecutionFailure,
    ExecutionPlanner,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)
from app.services.normalization import transport_rows
from app.services.projects import ProjectService
from app.services.report_formulas import (
    aggregation_config,
    formula_fields,
    formula_node,
    receipt_payload,
)
from app.services.report_inputs import ReportInputService
from app.services.report_projection import as_graph
from app.services.report_visualizations import preview_report_visualization
from app.services.workflow_presentation import validate_presentation
from app.services.workflows import execution_context, get_workflow, save_graph, validate_draft


def build_ids(request: ReportSourceRequest) -> ReportBuildResult:
    result = ReportBuildResult(
        **{key: uuid.uuid5(request.request_id, key) for key in ReportBuildResult.model_fields}
    )
    if request.published_input:
        result.workflow_id = request.published_input.workflow_id
    return result


def compile_report(
    request: ReportBuildRequest,
    saved: WorkflowRead | None = None,
    upstream: PublishedOutput | None = None,
) -> WorkflowSave:
    identity = build_ids(request)
    source_id = uuid.uuid5(request.request_id, "source")
    aggregate_id = uuid.uuid5(request.request_id, "aggregate")
    nodes = (
        []
        if saved
        else [
            NodePayload(
                id=source_id,
                type="dataset_source",
                version=1,
                position=PositionPayload(x=40, y=80),
                config={"source_id": str(request.source_id), "resource_id": request.resource_id},
            )
        ]
    )
    nodes.extend(formula_node(f, "row", 360 * (i + 1)) for i, f in enumerate(request.row_formulas))
    if request.filters:
        nodes.append(
            NodePayload(
                id=uuid.uuid5(request.request_id, "filter"),
                type="filter",
                version=1,
                position=PositionPayload(x=360 * len(nodes), y=80),
                config={"conditions": [f.model_dump(mode="json") for f in request.filters]},
            )
        )
    if request.comparison:
        nodes.append(
            NodePayload(
                id=uuid.uuid5(request.request_id, "calendar-period"),
                type="calendar_period",
                version=1,
                position=PositionPayload(x=360 * len(nodes), y=80),
                config={
                    "date_column_id": request.comparison.date_column_id,
                    "unit": request.comparison.unit,
                },
            )
        )
    nodes.append(
        NodePayload(
            id=aggregate_id,
            type="group_by",
            version=3 if request.measures[0].output_id else 2,
            position=PositionPayload(x=360 * len(nodes), y=80),
            config=aggregation_config(request),
        )
    )
    for formula in request.summary_formulas:
        nodes.append(formula_node(formula, "summary", 360 * len(nodes)))
    if request.comparison:
        nodes.append(
            NodePayload(
                id=uuid.uuid5(request.request_id, "period-comparison"),
                type="period_comparison",
                version=1,
                position=PositionPayload(x=360 * len(nodes), y=80),
                config={
                    **request.comparison.model_dump(mode="json"),
                    "partitions": [
                        d for d in request.dimensions if d != request.comparison.date_column_id
                    ],
                },
            )
        )
    if len({n.id for n in nodes}) != len(nodes) or (
        saved and {n.id for n in nodes} & {n.id for n in saved.nodes}
    ):
        raise ApplicationError("INVALID_REPORT", "Formula identities conflict with existing steps.")
    edges = [
        EdgePayload(
            id=uuid.uuid5(request.request_id, f"edge-{index}"),
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
                id=uuid.uuid5(request.request_id, "prepared-input-edge"),
                source_node_id=upstream.node_id,
                source_port=upstream.port,
                target_node_id=nodes[0].id,
                target_port="input",
            ),
        )
    if saved:
        row = max((n.position.y for n in saved.nodes), default=0) + 320
        for index, node in enumerate(nodes):
            node.position = PositionPayload(x=40 + 360 * index, y=row)
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


def visualization_config(
    request: ReportSettings, columns: list[ResolvedColumnRead], terminal_id: uuid.UUID | None = None
) -> VisualizationConfig:
    if request.presentation == "combo_chart":
        return VisualizationConfig(title=request.name, spec=request.combo)
    if request.presentation == "radar_chart":
        return VisualizationConfig(title=request.name, spec=request.radar)
    if request.comparison and request.presentation in {"bar_chart", "line_chart"}:
        from app.nodes.period_comparison import comparison_field_id

        if terminal_id is None:
            raise ValueError("Comparison chart requires its calculation endpoint.")
        previous = comparison_field_id(terminal_id, "previous")
        selected = {request.comparison.value_column_id, previous}
        if not selected <= {
            c.column_id for c in columns if c.logical_type in {"integer", "float", "decimal"}
        }:
            raise ValueError("Select an available output measure.")
        return VisualizationConfig(
            title=request.name,
            value_column_id=request.comparison.value_column_id,
            category_column_id=request.comparison.date_column_id,
            column_ids=[c.column_id for c in columns],
            # Empty series name follows the current schema label after a rename.
            additional_series=[AdditionalSeries(column_id=previous)],
        )
    measures = columns[len(request.dimensions) :]
    primary = request.value_field_id or measures[0].column_id
    if primary not in {c.column_id for c in measures}:
        raise ValueError("Select an available output measure.")
    return VisualizationConfig(
        title=request.name,
        value_column_id=primary,
        category_column_id=request.dimensions[0] if request.dimensions else None,
        column_ids=[column.column_id for column in columns],
        additional_series=[
            AdditionalSeries(column_id=c.column_id, name=c.display_name)
            for c in measures
            if c.column_id != primary
        ]
        if request.presentation in {"bar_chart", "line_chart"}
        else [],
    )


class ReportBuilderService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings

    def _compile(
        self, project_id: uuid.UUID, request: ReportBuildRequest
    ) -> tuple[Workflow, WorkflowSave]:
        workflow, saved, output = ReportInputService(
            self.session, self.storage, self.settings
        ).resolve(project_id, request, request.name)
        payload = compile_report(request, saved, output)
        if saved:
            validate_draft(payload, get_node_registry())
            if payload.presentation:
                validate_presentation(payload.presentation, payload, get_node_registry())
        return workflow, payload

    def fields(
        self, project_id: uuid.UUID, request: ReportBuildRequest, include_summary: bool = False
    ) -> ReportFormulaFields:
        workflow, payload = self._compile(
            project_id,
            request if include_summary else request.model_copy(update={"summary_formulas": []}),
        )
        context = execution_context(
            workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
        )
        try:
            return formula_fields(
                payload,
                workflow,
                context,
                uuid.uuid5(request.request_id, "aggregate"),
                [f.node_id for f in request.summary_formulas] if include_summary else None,
            )
        except ValueError as exc:
            raise ApplicationError("INVALID_REPORT", str(exc)) from exc

    def preview(self, project_id: uuid.UUID, request: ReportBuildRequest) -> ReportBuildPreview:
        workflow, payload = self._compile(project_id, request)
        identity = build_ids(request)
        graph = as_graph(payload, identity.workflow_id, project_id)
        context = execution_context(
            workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
        )
        try:
            result = WorkflowExecutionService(get_node_registry()).execute(
                graph, payload.nodes[-1].id, context
            )
        except ExecutionFailure as exc:
            raise ApplicationError(
                "INVALID_REPORT",
                exc.issues[0].message if exc.issues else exc.message,
                issues=[
                    {"code": issue.code, "field": issue.field, "message": issue.message}
                    for issue in exc.issues
                ],
            ) from exc
        if request.presentation == "kpi" and result.output.row_count != 1:
            raise ApplicationError(
                "INVALID_REPORT", "KPI needs one total. Remove grouping dimensions."
            )
        if request.presentation not in {"table", "kpi"} and not request.dimensions:
            raise ApplicationError("INVALID_REPORT", "Choose a dimension for this chart.")
        if request.presentation in {"bar_chart", "line_chart"} and (
            len(request.dimensions) != 1
            or (
                not request.comparison and len(request.measures) + len(request.summary_formulas) > 8
            )
        ):
            raise ApplicationError(
                "INVALID_REPORT", "Choose one dimension and up to eight measures, or use a table."
            )
        if (
            request.presentation == "kpi"
            and len(request.measures) + len(request.summary_formulas) != 1
            and not request.value_field_id
        ):
            raise ApplicationError("INVALID_REPORT", "Choose one measure for a KPI.")
        if request.presentation not in {"table", "kpi"} and result.output.row_count > 2000:
            raise ApplicationError(
                "INVALID_REPORT",
                "This chart supports up to 2000 groups. Use a table or a coarser grouping.",
            )
        columns = [ResolvedColumnRead(**c.to_dict()) for c in result.schema.columns]
        try:
            visual_preview = preview_report_visualization(
                workflow,
                identity.visualization_id,
                request.presentation,
                visualization_config(request, columns, payload.nodes[-1].id),
                result,
                context,
            )
        except ValueError as exc:
            raise ApplicationError("INVALID_REPORT", str(exc)) from exc
        return ReportBuildPreview(
            visualization=visual_preview,
            graph=payload,
            columns=columns,
            rows=transport_rows(result.output.frame.head(50)),
            total_rows=result.output.row_count,
            steps=[
                next(n.type for n in payload.nodes if n.id == identity)
                for identity in ExecutionPlanner(get_node_registry())
                .plan(graph, payload.nodes[-1].id)
                .ordered_node_ids
            ],
        )

    def apply(self, project_id: uuid.UUID, request: ReportBuildRequest) -> ReportBuildResult:
        ProjectService(self.session).lock(project_id)
        fingerprint = hashlib.sha256(
            json.dumps(receipt_payload(request), sort_keys=True).encode()
        ).hexdigest()
        receipt = self.session.get(ReportDocument, request.request_id)
        if receipt:
            if (
                receipt.project_id != project_id
                or receipt.kind != "builder_receipt"
                or receipt.payload.get("fingerprint") != fingerprint
            ):
                raise ApplicationError(
                    "REPORT_CONFLICT",
                    "This request identity was used for different report settings.",
                    409,
                )
            return ReportBuildResult.model_validate(receipt.payload["result"])
        preview = self.preview(project_id, request)
        identities = build_ids(request)
        try:
            if request.published_input:
                workflow = get_workflow(self.session, identities.workflow_id)
            else:
                workflow = Workflow(
                    id=identities.workflow_id, project_id=project_id, name=request.name
                )
                self.session.add(workflow)
                self.session.flush()
            save_graph(self.session, workflow, preview.graph, get_node_registry(), commit=False)
            config = visualization_config(request, preview.columns, preview.graph.nodes[-1].id)
            visualization = Visualization(
                id=identities.visualization_id,
                project_id=project_id,
                workflow_id=workflow.id,
                source_node_id=preview.graph.nodes[-1].id,
                publication_id=identities.publication_id,
                name=request.name,
                type=request.presentation,
                config=config.model_dump(mode="json"),
            )
            self.session.add(visualization)
            dashboard = Dashboard(
                id=identities.dashboard_id, project_id=project_id, name=request.name
            )
            self.session.add(dashboard)
            self.session.flush()
            self.session.add(
                DashboardWidget(
                    id=uuid.uuid5(request.request_id, "widget"),
                    dashboard_id=dashboard.id,
                    visualization_id=visualization.id,
                    title=request.name,
                    config={},
                    position_x=0,
                    position_y=0,
                    width=12,
                    height=12 if request.presentation == "radar_chart" else 8,
                )
            )
            self.session.add(
                ReportDocument(
                    id=request.request_id,
                    project_id=project_id,
                    kind="builder_receipt",
                    status="applied",
                    payload={
                        "fingerprint": fingerprint,
                        "result": identities.model_dump(mode="json"),
                    },
                )
            )
            self.session.commit()
            return identities
        except Exception:
            self.session.rollback()
            raise
