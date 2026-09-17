import uuid

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.domain.nodes import NodeRegistry
from app.schemas.dashboards import (
    DashboardRead,
    DashboardSave,
    DashboardVisualizationCreate,
    WidgetPayload,
)
from app.schemas.workflows import EdgePayload, NodePayload, PositionPayload, WorkflowSave
from app.services.dashboards import DashboardService
from app.services.projects import ProjectService
from app.services.workflows import get_workflow, read_workflow, save_graph


def create_visualization(
    session: Session,
    dashboard_id: uuid.UUID,
    payload: DashboardVisualizationCreate,
    registry: NodeRegistry,
) -> DashboardRead:
    service = DashboardService(session)
    try:
        # Lock project first, then dashboard before visualization locks.
        project_id = service.get(dashboard_id).project_id
        ProjectService(session).lock(project_id)
        dashboard = service.read(dashboard_id)
        if dashboard.revision != payload.expected_dashboard_revision:
            raise ApplicationError(
                "DASHBOARD_CONFLICT", "Dashboard changed elsewhere. Reload before saving.", 409
            )
        workflow = get_workflow(session, payload.workflow_id)
        if workflow.project_id != project_id:
            raise ApplicationError(
                "INVALID_VISUALIZATION",
                "A selected visualization is missing or belongs to another project.",
            )
        graph = read_workflow(session, workflow)
        if graph.revision != payload.expected_workflow_revision:
            raise ApplicationError(
                "WORKFLOW_CONFLICT",
                "This workflow was changed elsewhere. Reload before saving.",
                409,
            )
        source = next((node for node in graph.nodes if node.id == payload.source_node_id), None)
        if source is None or not any(
            port.id == "dataset" and port.kind.value == "dataset"
            for port in registry.get(source.type, source.version).output_ports
        ):
            raise ApplicationError("INVALID_NODE", "Select an available dataset node.")
        if any(node.id == payload.node_id for node in graph.nodes) or any(
            edge.id == payload.edge_id for edge in graph.edges
        ):
            raise ApplicationError("DUPLICATE_GRAPH_ID", "Node and edge IDs must be unique.")
        registry.get(payload.type, 1).config_schema.model_validate(payload.config)
        node = NodePayload(
            id=payload.node_id,
            type=payload.type,
            version=1,
            position=PositionPayload(x=source.position.x + 360, y=source.position.y),
            config=payload.config,
        )
        # Keep a new branch separate from already placed nodes.
        while any(
            abs(other.position.x - node.position.x) < 300
            and abs(other.position.y - node.position.y) < 180
            for other in graph.nodes
        ):
            node.position.y += 200
        edge = EdgePayload(
            id=payload.edge_id,
            source_node_id=source.id,
            source_port="dataset",
            target_node_id=node.id,
            target_port="input",
        )
        save_graph(
            session,
            workflow,
            WorkflowSave(
                name=graph.name,
                expected_revision=graph.revision,
                parameters=graph.parameters,
                nodes=[*graph.nodes, node],
                edges=[*graph.edges, edge],
            ),
            registry,
            commit=False,
        )
        widgets = list(dashboard.widgets)
        if payload.replace_existing:
            if not any(widget.id == payload.widget_id for widget in widgets):
                raise ApplicationError(
                    "WIDGET_NOT_FOUND", "The selected widget is unavailable.", 404
                )
            widgets = [
                widget.model_copy(update={"visualization_id": node.id})
                if widget.id == payload.widget_id
                else widget
                for widget in widgets
            ]
        else:
            widgets.append(
                WidgetPayload(
                    id=payload.widget_id,
                    visualization_id=node.id,
                    x=0,
                    y=max((widget.y + widget.height for widget in widgets), default=0),
                    width=6,
                    height=8,
                )
            )
        result = service.save(
            dashboard_id,
            DashboardSave(
                name=dashboard.name,
                expected_revision=dashboard.revision,
                configuration=dashboard.configuration,
                widgets=widgets,
            ),
            commit=False,
        )
        session.commit()
        return result
    except ValidationError as exc:
        session.rollback()
        raise ApplicationError(
            "INVALID_NODE_CONFIGURATION",
            "Check visualization fields and dashboard limits.",
        ) from exc
    except Exception:
        session.rollback()
        raise
