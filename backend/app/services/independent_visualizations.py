"""Revisioned visualization documents; graph persistence never owns their config."""

import hashlib
import json
import uuid
from collections.abc import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.measure_contracts import validate_measure_selection
from app.domain.nodes import NodeRegistry
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualization_inputs import BASIC_TYPES
from app.domain.visualizations import VisualizationConfig
from app.infrastructure.storage import StorageProvider
from app.models import Dashboard, DashboardWidget, Visualization, Workflow
from app.models.reporting import ReportDocument
from app.schemas.dashboards import (
    IndependentVisualizationSave,
    PublicationSchema,
    VisualizationRead,
)
from app.schemas.workflows import ResolvedColumnRead
from app.services.analytical_tables import suggested_analytical_spec, validate_analytical_table
from app.services.box_plot_visualizations import suggested_box_spec, validate_box_plot
from app.services.bubble_visualizations import validate_bubble
from app.services.bullet_visualizations import validate_bullet
from app.services.combo_visualizations import validate_combo
from app.services.execution import ExecutionPlanner, InMemoryExecutionCache
from app.services.funnel_visualizations import suggested_funnel_spec, validate_funnel
from app.services.heatmap_visualizations import suggested_heatmap_spec, validate_heatmap
from app.services.hierarchy_visualizations import suggested_hierarchy_spec, validate_hierarchy
from app.services.histogram_visualizations import suggested_histogram_spec, validate_histogram
from app.services.pareto_visualizations import suggested_pareto_spec, validate_pareto
from app.services.projects import ProjectService
from app.services.radar_visualizations import validate_radar
from app.services.waterfall_visualizations import suggested_waterfall_spec, validate_waterfall
from app.services.workflow_validation import WorkflowSchemaResolver


def publication(workflow: Workflow, identity: uuid.UUID) -> PublishedOutput:
    result = next(
        (
            item
            for item in ResultCatalog.model_validate(workflow.result_catalog).outputs
            if item.id == identity
        ),
        None,
    )
    if result is None:
        raise ApplicationError("PUBLICATION_NOT_FOUND", "Published result is unavailable.", 404)
    return result


def read_visualization(row: Visualization) -> VisualizationRead:
    return VisualizationRead(
        id=row.id,
        workflow_id=row.workflow_id,
        node_id=row.source_node_id,
        name=row.name,
        type=row.type,
        publication_id=row.publication_id,
        revision=row.revision,
        config=VisualizationConfig.model_validate(row.config) if row.publication_id else None,
    )


class IndependentVisualizationService:
    def __init__(self, session: Session):
        self.session = session

    def get(self, identity: uuid.UUID) -> Visualization:
        row = self.session.scalar(
            select(Visualization)
            .where(Visualization.id == identity)
            .execution_options(populate_existing=True)
        )
        if row is None:
            raise ApplicationError("VISUALIZATION_NOT_FOUND", "Visualization does not exist.", 404)
        return row

    def save(
        self,
        project_id: uuid.UUID,
        payload: IndependentVisualizationSave,
        identity: uuid.UUID | None = None,
        *,
        copy_from: uuid.UUID | None = None,
        validate_result: Callable[[Visualization], object] | None = None,
    ) -> VisualizationRead:
        ProjectService(self.session).lock(project_id)
        # Capture the submitted settings before semantic guards fill inherited fields.
        receipt_id = (
            uuid.uuid5(project_id, f"visualization-save:{payload.request_id}")
            if payload.request_id
            else None
        )
        fingerprint = hashlib.sha256(
            json.dumps(
                {
                    "identity": str(identity) if identity else None,
                    "copy_from": str(copy_from) if copy_from else None,
                    "settings": payload.model_dump(mode="json", exclude={"request_id"}),
                },
                sort_keys=True,
            ).encode()
        ).hexdigest()
        if receipt_id and (receipt := self.session.get(ReportDocument, receipt_id)):
            if (
                receipt.project_id != project_id
                or receipt.kind != "visualization_save_receipt"
                or receipt.payload.get("fingerprint") != fingerprint
            ):
                raise ApplicationError(
                    "VISUALIZATION_REQUEST_CONFLICT",
                    "This save request was already used for different settings.",
                    409,
                )
            saved = self.session.scalar(
                select(Visualization)
                .where(Visualization.id == uuid.UUID(receipt.payload["visualization_id"]))
                .execution_options(populate_existing=True)
            )
            if saved is None or saved.project_id != project_id:
                raise ApplicationError(
                    "VISUALIZATION_RESULT_GONE",
                    "The saved visualization was deleted. This retry will not recreate it.",
                    410,
                )
            # Return current settings if another edit followed the acknowledged operation.
            return read_visualization(saved)
        original = None
        if copy_from:
            original = self.get(copy_from)
            if original.project_id != project_id or original.publication_id is None:
                raise ApplicationError(
                    "INVALID_VISUALIZATION", "Select an independent visualization."
                )
            if original.revision != payload.expected_revision:
                raise ApplicationError(
                    "VISUALIZATION_CONFLICT",
                    "Visualization changed elsewhere. Reload before copying.",
                    409,
                )
        row = self.get(identity) if identity else None
        if row and (row.project_id != project_id or row.publication_id is None):
            raise ApplicationError(
                "INVALID_VISUALIZATION", "Select an independent visualization in this project."
            )
        if row and row.revision != payload.expected_revision:
            raise ApplicationError(
                "VISUALIZATION_CONFLICT",
                "Visualization changed elsewhere. Reload before saving.",
                409,
            )
        workflow = self.session.scalar(
            select(Workflow)
            .where(Workflow.id == payload.workflow_id)
            .execution_options(populate_existing=True)
        )
        if workflow is None or workflow.project_id != project_id:
            raise ApplicationError(
                "INVALID_PUBLICATION", "Select a published result in this project."
            )
        if workflow.revision != payload.expected_workflow_revision:
            raise ApplicationError(
                "WORKFLOW_CONFLICT", "Published data changed elsewhere. Reload before saving.", 409
            )
        output = publication(workflow, payload.publication_id)
        if output.kind == "scalar" and payload.type != "kpi":
            raise ApplicationError(
                "INVALID_VISUALIZATION", "A scalar result can only be displayed as KPI."
            )
        protected = row or original
        if (
            protected
            and payload.type in BASIC_TYPES
            and payload.type == protected.type
            and workflow.id == protected.workflow_id
            and output.id == protected.publication_id
            and payload.config.model_fields_set
            and not payload.config.model_fields_set.intersection(
                {
                    "value_column_id",
                    "category_column_id",
                    "column_ids",
                    "additional_series",
                }
            )
        ):
            payload.config = VisualizationConfig.model_validate(
                {
                    **protected.config,
                    **payload.config.model_dump(exclude_unset=True),
                }
            )
        if protected and protected.config.get("grain_column_ids") is not None:
            # Appearance edits/older clients must not remove the semantic reuse guard.
            payload.config.grain_column_ids = protected.config["grain_column_ids"]
            payload.config.measure_column_ids = protected.config.get("measure_column_ids")
            if (
                payload.config.value_column_id != protected.config.get("value_column_id")
                or workflow.id != protected.workflow_id
                or output.id != protected.publication_id
            ):
                raise ApplicationError(
                    "INVALID_VISUALIZATION",
                    "Create another measure report to change its value field.",
                )
        try:
            from app.services.workflows import domain_graph

            if (
                protected
                and payload.type
                in {
                    "box_plot",
                    "histogram_chart",
                    "heatmap_chart",
                    "radar_chart",
                    "waterfall_chart",
                    "combo_chart",
                    "bubble_chart",
                    "pareto_chart",
                    "funnel_chart",
                    "treemap_chart",
                    "sunburst_chart",
                    "bullet_chart",
                    "analytical_table",
                }
                and payload.config.spec is None
            ):
                payload.config.spec = VisualizationConfig.model_validate(protected.config).spec
            validate_measure_selection(payload.config, payload.type)
            graph = domain_graph(self.session, workflow)
            catalog = ResultCatalog.model_validate(workflow.result_catalog)
            for validate in (
                validate_box_plot,
                validate_histogram,
                validate_heatmap,
                validate_radar,
                validate_waterfall,
                validate_combo,
                validate_bubble,
                validate_bullet,
                validate_pareto,
                validate_funnel,
                validate_hierarchy,
                validate_analytical_table,
            ):
                validate(payload.type, payload.config, graph, output, catalog)
        except ValueError as exc:
            raise ApplicationError("INVALID_VISUALIZATION", str(exc)) from exc
        if (payload.type in BASIC_TYPES and validate_result is not None) or payload.type in {
            "radar_chart",
            "combo_chart",
            "bubble_chart",
            "pareto_chart",
            "funnel_chart",
            "treemap_chart",
            "sunburst_chart",
            "bullet_chart",
        }:
            if validate_result is None:
                raise ApplicationError(
                    "INVALID_VISUALIZATION",
                    "This chart requires full-data validation before saving.",
                )
            validate_result(self.draft(project_id, payload))
        if row is None:
            row = Visualization(project_id=project_id, workflow_id=workflow.id)
            self.session.add(row)
            row.revision = 1
        else:
            row.revision += 1
        row.workflow_id = workflow.id
        row.publication_id = output.id
        row.source_node_id = output.node_id
        row.name = payload.name.strip()
        if not row.name:
            raise ApplicationError("INVALID_VISUALIZATION", "Enter a visualization name.")
        row.type = payload.type
        row.config = payload.config.model_dump(mode="json")
        self.session.flush()
        result = read_visualization(row)
        if receipt_id:
            self.session.add(
                ReportDocument(
                    id=receipt_id,
                    project_id=project_id,
                    kind="visualization_save_receipt",
                    status="applied",
                    payload={"fingerprint": fingerprint, "visualization_id": str(row.id)},
                )
            )
        self.session.commit()
        return result

    def draft(self, project_id: uuid.UUID, payload: IndependentVisualizationSave) -> Visualization:
        from app.services.workflows import domain_graph

        workflow = self.session.get(Workflow, payload.workflow_id)
        if workflow is None or workflow.project_id != project_id:
            raise ApplicationError(
                "INVALID_PUBLICATION", "Select a published result in this project."
            )
        if workflow.revision != payload.expected_workflow_revision:
            raise ApplicationError(
                "WORKFLOW_CONFLICT",
                "Published data changed elsewhere. Reload before previewing.",
                409,
            )
        output = publication(workflow, payload.publication_id)
        if output.kind == "scalar" and payload.type != "kpi":
            raise ApplicationError(
                "INVALID_VISUALIZATION", "A scalar result can only be displayed as KPI."
            )
        try:
            validate_measure_selection(payload.config, payload.type)
            graph = domain_graph(self.session, workflow)
            catalog = ResultCatalog.model_validate(workflow.result_catalog)
            for validate in (
                validate_box_plot,
                validate_histogram,
                validate_heatmap,
                validate_radar,
                validate_waterfall,
                validate_combo,
                validate_bubble,
                validate_bullet,
                validate_pareto,
                validate_funnel,
                validate_hierarchy,
                validate_analytical_table,
            ):
                validate(payload.type, payload.config, graph, output, catalog)
        except ValueError as exc:
            raise ApplicationError("INVALID_VISUALIZATION", str(exc)) from exc
        return Visualization(
            id=uuid.uuid4(),
            project_id=project_id,
            workflow_id=workflow.id,
            publication_id=output.id,
            source_node_id=output.node_id,
            name=payload.name,
            type=payload.type,
            revision=1,
            config=payload.config.model_dump(mode="json"),
        )

    def delete(self, identity: uuid.UUID, expected_revision: int) -> None:
        project_id = self.get(identity).project_id
        ProjectService(self.session).lock(project_id)
        row = self.get(identity)
        # Dashboard saves take shared row locks before attaching a visualization.
        self.session.scalar(
            select(Visualization).where(Visualization.id == identity).with_for_update()
        )
        if row.revision != expected_revision:
            raise ApplicationError(
                "VISUALIZATION_CONFLICT",
                "Visualization changed elsewhere. Reload before saving.",
                409,
            )
        if self.session.scalar(
            select(DashboardWidget.id).where(DashboardWidget.visualization_id == identity).limit(1)
        ):
            raise ApplicationError(
                "VISUALIZATION_IN_USE",
                "Remove this visualization from dashboards before deleting it.",
                409,
            )
        self.session.delete(row)
        self.session.commit()

    def uses(self, identity: uuid.UUID) -> list[dict[str, str]]:
        self.get(identity)
        return [
            {"dashboard_id": str(dashboard.id), "name": dashboard.name, "widget_id": str(widget.id)}
            for dashboard, widget in self.session.execute(
                select(Dashboard, DashboardWidget)
                .join(DashboardWidget, DashboardWidget.dashboard_id == Dashboard.id)
                .where(DashboardWidget.visualization_id == identity)
            )
        ]


def published_schema(
    session: Session,
    workflow_id: uuid.UUID,
    publication_id: uuid.UUID,
    registry: NodeRegistry,
    storage: StorageProvider,
    settings: Settings,
    cache: InMemoryExecutionCache,
) -> PublicationSchema:
    from app.services.workflows import domain_graph, execution_context, get_workflow

    workflow = get_workflow(session, workflow_id)
    published = publication(workflow, publication_id)
    context = execution_context(workflow, session, storage, settings, cache)
    branch = (
        ExecutionPlanner(registry).plan(domain_graph(session, workflow), published.node_id).graph
    )
    resolved = WorkflowSchemaResolver(registry).resolve(branch, context)
    result = next((item for item in resolved.nodes if item.node_id == published.node_id), None)
    value = result.outputs.get(published.port) if result and result.outputs else None
    if value is None or value.kind != published.kind:
        raise ApplicationError(
            "PUBLICATION_UNAVAILABLE", "Configure the published output and its upstream nodes."
        )
    catalog = ResultCatalog.model_validate(workflow.result_catalog)
    contexts = [item for item in catalog.contexts if item.id in published.context_ids]
    for data_context in contexts:
        for point in data_context.points:
            point_result = next(
                (item for item in resolved.nodes if item.node_id == point.node_id), None
            )
            if point_result is None:
                continue
            table = point_result.outputs.get(point.port) if point_result.outputs else None
            if table is None or table.table is None:
                raise ApplicationError(
                    "INVALID_CONTEXT",
                    "Choose a table output for the view restriction.",
                    node_id=str(point.node_id),
                )
            try:
                column = table.table.by_id(point.column_id)
                expected = (
                    {"date", "datetime"}
                    if point.role == "period"
                    else {
                        next(
                            role.logical_type
                            for role in data_context.roles
                            if role.name == point.role
                        )
                    }
                )
                if column.logical_type.value not in expected:
                    raise ValueError(
                        "Context field has an incompatible type. Convert it explicitly."
                    )
            except (ValueError, StopIteration) as exc:
                raise ApplicationError(
                    "INVALID_CONTEXT",
                    str(exc) or "The context field is unavailable.",
                    node_id=str(point.node_id),
                ) from exc
    return PublicationSchema(
        suggested_specs=[
            spec
            for spec in (
                suggested_box_spec(branch, published),
                suggested_histogram_spec(branch, published),
                suggested_heatmap_spec(branch, published),
                suggested_waterfall_spec(branch, published),
                suggested_pareto_spec(branch, published),
                suggested_funnel_spec(branch, published),
                suggested_analytical_spec(branch, published),
                suggested_hierarchy_spec(branch, published, "treemap_chart"),
                suggested_hierarchy_spec(branch, published, "sunburst_chart"),
            )
            if spec is not None
        ],
        workflow_revision=workflow.revision,
        kind=value.kind,
        columns=[ResolvedColumnRead(**column.to_dict()) for column in value.table.columns]
        if value.table
        else [],
        roles=list({role.name: role for item in contexts for role in item.roles}.values()),
        period_supported=any(
            point.role == "period" and point.node_id in {node.id for node in branch.nodes}
            for item in contexts
            for point in item.points
        ),
    )
