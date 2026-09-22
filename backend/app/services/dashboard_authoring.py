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
from app.schemas.presentation import PublicPort, WorkflowPresentation
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
        copied = next(
            (widget for widget in dashboard.widgets if widget.id == payload.widget_id), None
        )
        bound_copy = bool(
            payload.replace_existing
            and copied
            and copied.visualization_id == source.id
            and source.type == payload.type
            and source.version == 2
            and source.type in {"bar_chart", "kpi"}
        )
        version = 2 if bound_copy else 1
        registry.get(payload.type, version).config_schema.model_validate(payload.config)
        node = NodePayload(
            id=payload.node_id,
            type=payload.type,
            version=version,
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
        added_edges = [edge]
        if bound_copy:
            # Copy the explicit bindings, not the original visualization's materialized result.
            added_edges = [
                item.model_copy(
                    update={
                        "id": payload.edge_id if index == 0 else uuid.uuid4(),
                        "target_node_id": node.id,
                    }
                )
                for index, item in enumerate(
                    item for item in graph.edges if item.target_node_id == source.id
                )
            ]
        presentation = (graph.presentation or WorkflowPresentation()).model_copy(deep=True)
        for block in presentation.blocks:
            for item in added_edges:
                if item.source_node_id in block.node_ids and not any(
                    port.node_id == item.source_node_id
                    and port.port == item.source_port
                    and port.column_id == item.source_column_id
                    for port in block.outputs
                ):
                    origin = next(n for n in graph.nodes if n.id == item.source_node_id)
                    block.outputs.append(
                        PublicPort(
                            id=uuid.uuid4(),
                            label=str(origin.ui.get("label") or item.source_port)[:200],
                            node_id=item.source_node_id,
                            port=item.source_port,
                            column_id=item.source_column_id,
                        )
                    )
        save_graph(
            session,
            workflow,
            WorkflowSave(
                format_version=graph.version,
                presentation=presentation if graph.version == 2 else None,
                name=graph.name,
                expected_revision=graph.revision,
                parameters=graph.parameters,
                nodes=[*graph.nodes, node],
                edges=[*graph.edges, *added_edges],
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
            if bound_copy:
                old_prefix, new_prefix = f"viz_{source.id.hex}_", f"viz_{node.id.hex}_"
                for widget in widgets:
                    action = widget.config.action
                    if widget.id == payload.widget_id and action:
                        widget.config = widget.config.model_copy(
                            update={
                                "action": action.model_copy(
                                    update={
                                        "values": {
                                            name: value.model_copy(
                                                update={
                                                    "name": new_prefix
                                                    + value.name[len(old_prefix) :]
                                                }
                                            )
                                            if value.source == "field"
                                            and value.name
                                            in {old_prefix + "category", old_prefix + "value"}
                                            else value
                                            for name, value in action.values.items()
                                        }
                                    }
                                )
                            }
                        )
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
