from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError, GraphOwnershipError, WorkflowConflictError
from app.domain.nodes import NodeRegistry, UnknownNodeTypeError
from app.models import Workflow, WorkflowEdge, WorkflowNode
from app.repositories.sqlalchemy import SqlAlchemyWorkflowRepository
from app.schemas.workflows import (
    EdgePayload,
    NodePayload,
    PositionPayload,
    WorkflowRead,
    WorkflowSave,
)


def validate_draft(payload: WorkflowSave, registry: NodeRegistry) -> None:
    node_ids = [node.id for node in payload.nodes]
    edge_ids = [edge.id for edge in payload.edges]
    if len(node_ids) != len(set(node_ids)) or len(edge_ids) != len(set(edge_ids)):
        raise ApplicationError("DUPLICATE_GRAPH_ID", "Node and edge IDs must be unique.")
    known = set(node_ids)
    for node in payload.nodes:
        try:
            registry.get(node.type, node.version)
        except UnknownNodeTypeError as exc:
            raise ApplicationError("INVALID_NODE", str(exc)) from exc
    for edge in payload.edges:
        if edge.source_node_id not in known or edge.target_node_id not in known:
            raise ApplicationError("INVALID_EDGE", "Edge references a missing node.")


def save_graph(
    session: Session, workflow: Workflow, payload: WorkflowSave, registry: NodeRegistry
) -> WorkflowRead:
    validate_draft(payload, registry)
    workflow.name = payload.name.strip()
    nodes = [
        WorkflowNode(
            id=node.id,
            workflow_id=workflow.id,
            node_type=node.type,
            node_version=node.version,
            position_x=node.position.x,
            position_y=node.position.y,
            config=node.config,
            ui_state=node.ui,
        )
        for node in payload.nodes
    ]
    edges = [
        WorkflowEdge(
            id=edge.id,
            workflow_id=workflow.id,
            source_node_id=edge.source_node_id,
            source_port=edge.source_port,
            target_node_id=edge.target_node_id,
            target_port=edge.target_port,
        )
        for edge in payload.edges
    ]
    try:
        SqlAlchemyWorkflowRepository(session).save_graph(
            workflow, nodes, edges, expected_revision=payload.expected_revision
        )
        result = read_workflow(session, workflow)
        session.commit()
    except WorkflowConflictError as exc:
        session.rollback()
        raise ApplicationError("WORKFLOW_CONFLICT", str(exc), 409) from exc
    except (IntegrityError, GraphOwnershipError) as exc:
        session.rollback()
        raise ApplicationError(
            "INVALID_GRAPH", "Workflow graph could not be saved atomically."
        ) from exc
    return result


def read_workflow(session: Session, workflow: Workflow) -> WorkflowRead:
    locked = session.scalar(
        select(Workflow)
        .where(Workflow.id == workflow.id)
        .with_for_update(read=True)
        .execution_options(populate_existing=True)
    )
    if locked is None:
        raise ApplicationError("WORKFLOW_NOT_FOUND", "Workflow does not exist.", 404)
    nodes = session.scalars(
        select(WorkflowNode).where(WorkflowNode.workflow_id == workflow.id)
    ).all()
    edges = session.scalars(
        select(WorkflowEdge).where(WorkflowEdge.workflow_id == workflow.id)
    ).all()
    return WorkflowRead(
        revision=workflow.revision,
        id=workflow.id,
        project_id=workflow.project_id,
        name=workflow.name,
        version=workflow.version,
        nodes=[
            NodePayload(
                id=node.id,
                type=node.node_type,
                version=node.node_version,
                position=PositionPayload(x=node.position_x, y=node.position_y),
                config=node.config,
                ui=node.ui_state,
            )
            for node in nodes
        ],
        edges=[
            EdgePayload(
                id=edge.id,
                source_node_id=edge.source_node_id,
                source_port=edge.source_port,
                target_node_id=edge.target_node_id,
                target_port=edge.target_port,
            )
            for edge in edges
        ],
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )
