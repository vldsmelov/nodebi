"""Guided alignment appends a normal node; saved graphs own all calculation semantics."""

import hashlib
import json
import uuid

from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.join_diagnostics import AlignmentDiagnostics
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualizations import VisualizationConfig
from app.domain.workflows import NodeInstance, Position
from app.infrastructure.storage import StorageProvider
from app.models import Dashboard, DashboardWidget, ReportDocument, Visualization, Workflow
from app.nodes import get_node_registry
from app.nodes.visualization import VisualizationExecutor
from app.schemas.alignment_reports import (
    AlignmentReportFields,
    AlignmentReportPreview,
    AlignmentReportRequest,
)
from app.schemas.report_builder import ReportBuildResult
from app.schemas.workflows import (
    EdgePayload,
    NodePayload,
    PositionPayload,
    ResolvedColumnRead,
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
from app.services.report_formulas import formula_node
from app.services.report_inputs import ReportInputService
from app.services.report_projection import as_graph
from app.services.workflow_presentation import validate_presentation
from app.services.workflow_validation import WorkflowSchemaResolver
from app.services.workflows import execution_context, get_workflow, save_graph, validate_draft


def alignment_ids(request: AlignmentReportRequest) -> ReportBuildResult:
    return ReportBuildResult(
        workflow_id=request.workflow_id,
        publication_id=uuid.uuid5(request.request_id, "alignment-publication"),
        visualization_id=uuid.uuid5(request.request_id, "alignment-visualization"),
        dashboard_id=uuid.uuid5(request.request_id, "alignment-dashboard"),
    )


def table_config(preview: AlignmentReportPreview, name: str, key_count: int) -> VisualizationConfig:
    columns = preview.columns
    # Explicit roles: keys, two measures, two presence flags, then exact formulas.
    return VisualizationConfig(
        title=name,
        column_ids=[c.column_id for c in columns],
        grain_column_ids=[c.column_id for c in columns[:key_count]],
        value_column_id=columns[key_count].column_id,
        # Guard the two reused measures; derived nodes validate their own numeric inputs.
        measure_column_ids=[c.column_id for c in columns[key_count : key_count + 2]],
    )


class AlignmentReportService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings

    def compose(
        self, project_id: uuid.UUID, request: AlignmentReportRequest
    ) -> tuple[Workflow, WorkflowSave, uuid.UUID]:
        inputs = ReportInputService(self.session, self.storage, self.settings)
        workflow, saved, left = inputs.load(
            project_id, request.workflow_id, request.left_publication_id, request.expected_token
        )
        _, _, right = inputs.load(
            project_id, request.workflow_id, request.right_publication_id, request.expected_token
        )
        identity = alignment_ids(request)
        node_id = uuid.uuid5(request.request_id, "alignment-node")
        node = NodePayload(
            id=node_id,
            type="align_measures",
            version=1,
            position=PositionPayload(
                x=400, y=max((n.position.y for n in saved.nodes), default=0) + 320
            ),
            config=request.alignment.model_dump(mode="json"),
        )
        catalog = (
            saved.result_catalog.model_copy(deep=True) if saved.result_catalog else ResultCatalog()
        )
        catalog.outputs.append(
            PublishedOutput(
                id=identity.publication_id,
                node_id=request.formulas[-1].node_id if request.formulas else node_id,
                port="dataset",
                kind="dataset",
                name=request.name,
            )
        )
        graph = WorkflowSave(
            name=saved.name,
            expected_revision=saved.revision,
            format_version=3,
            nodes=[*saved.nodes, node],
            edges=[
                *saved.edges,
                *[
                    EdgePayload(
                        id=uuid.uuid5(request.request_id, f"alignment-{side}"),
                        source_node_id=output.node_id,
                        source_port=output.port,
                        target_node_id=node_id,
                        target_port=side,
                    )
                    for side, output in (("left", left), ("right", right))
                ],
            ],
            parameters=saved.parameters,
            presentation=saved.presentation,
            result_catalog=catalog,
        )
        previous = node_id
        for index, formula in enumerate(request.formulas):
            derived = formula_node(formula, "alignment", 650 + 250 * index)
            derived.position.y = node.position.y
            graph.nodes.append(derived)
            graph.edges.append(
                EdgePayload(
                    id=uuid.uuid5(request.request_id, f"alignment-formula-{formula.node_id}"),
                    source_node_id=previous,
                    source_port="dataset",
                    target_node_id=formula.node_id,
                    target_port="input",
                )
            )
            previous = formula.node_id
        registry = get_node_registry()
        validate_draft(graph, registry)
        if graph.presentation:
            validate_presentation(graph.presentation, graph, registry)
        return workflow, graph, node_id

    def fields(
        self, project_id: uuid.UUID, request: AlignmentReportRequest
    ) -> AlignmentReportFields:
        workflow, graph, alignment_id = self.compose(project_id, request)
        return self.fields_graph(
            workflow, graph, alignment_id, [f.node_id for f in request.formulas]
        )

    def fields_graph(
        self,
        workflow: Workflow,
        graph: WorkflowSave,
        alignment_id: uuid.UUID,
        formula_ids: list[uuid.UUID],
    ) -> AlignmentReportFields:
        context = execution_context(
            workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
        )
        registry = get_node_registry()
        plan = ExecutionPlanner(registry).plan(
            as_graph(graph, workflow.id, workflow.project_id),
            formula_ids[-1] if formula_ids else alignment_id,
        )
        resolved = WorkflowSchemaResolver(registry).resolve(plan.graph, context)
        errors = [issue for issue in resolved.issues if issue.severity == "error"]
        if errors:
            raise ApplicationError(
                "INVALID_ALIGNMENT_REPORT",
                errors[0].message,
                node_id=str(errors[0].node_id) if errors[0].node_id else None,
            )

        def columns(identity: uuid.UUID) -> list[ResolvedColumnRead]:
            output = next(n for n in resolved.nodes if n.node_id == identity).outputs["dataset"]
            if output.table is None:
                raise ApplicationError(
                    "INVALID_ALIGNMENT_REPORT", "The table schema is unavailable."
                )
            return [ResolvedColumnRead(**c.to_dict()) for c in output.table.columns]

        return AlignmentReportFields(
            columns=columns(alignment_id),
            formula_outputs={str(identity): columns(identity) for identity in formula_ids},
        )

    def preview(
        self, project_id: uuid.UUID, request: AlignmentReportRequest
    ) -> AlignmentReportPreview:
        workflow, graph, alignment_id = self.compose(project_id, request)
        return self.preview_graph(
            workflow,
            graph,
            alignment_id,
            [f.node_id for f in request.formulas],
            alignment_ids(request).visualization_id,
            request.name,
        )

    def preview_graph(
        self,
        workflow: Workflow,
        graph: WorkflowSave,
        alignment_id: uuid.UUID,
        formula_ids: list[uuid.UUID],
        visualization_id: uuid.UUID,
        name: str,
        config: VisualizationConfig | None = None,
    ) -> AlignmentReportPreview:
        registry = get_node_registry()
        context = execution_context(
            workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
        )
        try:
            result = WorkflowExecutionService(registry).execute(
                as_graph(graph, workflow.id, workflow.project_id),
                formula_ids[-1] if formula_ids else alignment_id,
                context,
            )
        except ExecutionFailure as exc:
            raise ApplicationError(
                "INVALID_ALIGNMENT_REPORT",
                exc.issues[0].message if exc.issues else exc.message,
                node_id=str(exc.node_id) if exc.node_id else None,
                execution_id=str(exc.execution_id),
                issues=[
                    {
                        "code": issue.code,
                        "node_id": str(issue.node_id) if issue.node_id else None,
                        "field": issue.field,
                        "message": issue.message,
                    }
                    for issue in exc.issues
                ],
            ) from exc
        columns = [ResolvedColumnRead(**c.to_dict()) for c in result.schema.columns]
        # Exact unary formulas append one field each without changing the aligned input schema.
        base_count = len(next(n for n in graph.nodes if n.id == alignment_id).config["keys"]) + 4
        preview = AlignmentReportPreview(
            graph=graph,
            columns=columns,
            formula_fields=AlignmentReportFields(
                columns=columns[:base_count],
                formula_outputs={
                    str(identity): columns[: base_count + index + 1]
                    for index, identity in enumerate(formula_ids)
                },
            ),
            rows=transport_rows(result.output.frame.head(50)),
            total_rows=result.output.row_count,
            steps=["align_measures", *["calculated_column" for _ in formula_ids]],
            alignment_diagnostics=AlignmentDiagnostics.model_validate(
                result.output.metadata["alignment_diagnostics"]
            ),
        )
        try:
            VisualizationExecutor().execute(
                NodeInstance(
                    visualization_id,
                    "table",
                    1,
                    Position(0, 0),
                    (
                        config
                        or table_config(
                            preview,
                            name,
                            len(
                                next(n for n in graph.nodes if n.id == alignment_id).config["keys"]
                            ),
                        )
                    ).model_dump(),
                ),
                {"input": result.output},
                context,
            )
        except ValueError as exc:
            raise ApplicationError("INVALID_ALIGNMENT_REPORT", str(exc)) from exc
        return preview

    def apply(self, project_id: uuid.UUID, request: AlignmentReportRequest) -> ReportBuildResult:
        ProjectService(self.session).lock(project_id)
        payload = request.model_dump(mode="json")
        if not request.formulas:
            payload.pop("formulas")  # Preserve pre-formula retry receipts.
        fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        receipt = self.session.get(ReportDocument, request.request_id)
        if receipt:
            if (
                receipt.project_id != project_id
                or receipt.kind != "alignment_report_receipt"
                or receipt.payload.get("fingerprint") != fingerprint
            ):
                raise ApplicationError(
                    "REPORT_CONFLICT",
                    "This request identity was used for different report settings.",
                    409,
                )
            return ReportBuildResult.model_validate(receipt.payload["result"])
        preview = self.preview(project_id, request)
        identity = alignment_ids(request)
        try:
            save_graph(
                self.session,
                get_workflow(self.session, request.workflow_id),
                preview.graph,
                get_node_registry(),
                commit=False,
            )
            self.session.add(
                Visualization(
                    id=identity.visualization_id,
                    project_id=project_id,
                    workflow_id=request.workflow_id,
                    publication_id=identity.publication_id,
                    source_node_id=preview.graph.nodes[-1].id,
                    name=request.name,
                    type="table",
                    config=table_config(
                        preview, request.name, len(request.alignment.keys)
                    ).model_dump(mode="json"),
                )
            )
            self.session.add(
                Dashboard(id=identity.dashboard_id, project_id=project_id, name=request.name)
            )
            self.session.flush()
            self.session.add(
                DashboardWidget(
                    id=uuid.uuid5(request.request_id, "alignment-widget"),
                    dashboard_id=identity.dashboard_id,
                    visualization_id=identity.visualization_id,
                    title=request.name,
                    config={},
                    position_x=0,
                    position_y=0,
                    width=12,
                    height=8,
                )
            )
            self.session.add(
                ReportDocument(
                    id=request.request_id,
                    project_id=project_id,
                    kind="alignment_report_receipt",
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
