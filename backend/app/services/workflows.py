import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError, GraphOwnershipError, WorkflowConflictError
from app.domain.nodes import ExecutionContext, NodeRegistry, UnknownNodeTypeError
from app.domain.parameters import ParameterDefinition, ParameterValue, resolve_parameters
from app.domain.workflows import (
    NodeInstance,
    Position,
    WorkflowGraph,
)
from app.domain.workflows import (
    WorkflowEdge as DomainWorkflowEdge,
)
from app.infrastructure.storage import StorageProvider
from app.models import DataSource, Workflow, WorkflowEdge, WorkflowNode
from app.repositories.sqlalchemy import SqlAlchemyWorkflowRepository
from app.schemas.workflows import (
    EdgePayload,
    NodePayload,
    PositionPayload,
    WorkflowRead,
    WorkflowSave,
)
from app.services.execution import InMemoryExecutionCache, default_execution_logger
from app.services.projects import ProjectService
from app.services.source_access import ProjectSourceAccess
from app.services.visualization_index import protect_used_visualizations, synchronize_visualizations


def get_workflow(session: Session, workflow_id: uuid.UUID) -> Workflow:
    workflow = session.get(Workflow, workflow_id)
    if workflow is None:
        raise ApplicationError("WORKFLOW_NOT_FOUND", "Workflow does not exist.", 404)
    return workflow


def list_workflows(session: Session, project_id: uuid.UUID) -> list[Workflow]:
    ProjectService(session).get(project_id)
    return list(SqlAlchemyWorkflowRepository(session).list_for_project(project_id))


def create_workflow(session: Session, project_id: uuid.UUID, name: str) -> WorkflowRead:
    ProjectService(session).get(project_id)
    workflow = SqlAlchemyWorkflowRepository(session).add(Workflow(project_id=project_id, name=name))
    session.flush()
    result = read_workflow(session, workflow)
    session.commit()
    return result


def delete_workflow(session: Session, workflow_id: uuid.UUID) -> None:
    SqlAlchemyWorkflowRepository(session).delete(get_workflow(session, workflow_id))
    session.commit()


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
    session: Session,
    workflow: Workflow,
    payload: WorkflowSave,
    registry: NodeRegistry,
    *,
    commit: bool = True,
) -> WorkflowRead:
    validate_draft(payload, registry)
    # Serialize reference changes with source/project deletion. JSON configuration
    # cannot express this cross-table relationship as a database foreign key.
    ProjectService(session).lock(workflow.project_id)
    # Read after acquiring the project lock: this ORM instance may predate a
    # concurrent format upgrade. Revision acknowledgement alone is insufficient
    # for a client that reads a v2 graph but cannot preserve its new semantics.
    with session.no_autoflush:
        stored_version = session.scalar(select(Workflow.version).where(Workflow.id == workflow.id))
    if stored_version is None:
        raise ApplicationError("WORKFLOW_NOT_FOUND", "Workflow does not exist.", 404)
    if payload.format_version < stored_version:
        raise ApplicationError(
            "WORKFLOW_FORMAT_UNSUPPORTED",
            "Open this workflow in an editor that supports its format before saving.",
            409,
        )
    protect_used_visualizations(session, workflow, payload)
    for node in payload.nodes:
        if node.type != "excel_source" or not node.config.get("source_id"):
            continue
        try:
            source_id = uuid.UUID(str(node.config["source_id"]))
        except ValueError as exc:
            raise ApplicationError(
                "INVALID_SOURCE", "Select an available Excel source.", node_id=str(node.id)
            ) from exc
        source = session.scalar(
            select(DataSource).where(
                DataSource.id == source_id, DataSource.project_id == workflow.project_id
            )
        )
        if source is None:
            raise ApplicationError(
                "INVALID_SOURCE",
                "The selected source is unavailable in this project. Select another source.",
                node_id=str(node.id),
            )
    workflow.name = payload.name.strip()
    workflow.version = payload.format_version
    if payload.parameters is not None:
        workflow.parameters = [item.model_dump(mode="json") for item in payload.parameters]
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
        synchronize_visualizations(session, workflow, payload)
        result = read_workflow(session, workflow)
        if commit:
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
        parameters=workflow.parameters,
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


def domain_graph(session: Session, workflow: Workflow) -> WorkflowGraph:
    payload = read_workflow(session, workflow)
    return WorkflowGraph(
        id=workflow.id,
        project_id=workflow.project_id,
        name=workflow.name,
        version=workflow.version,
        nodes=tuple(
            NodeInstance(
                node.id,
                node.type,
                node.version,
                Position(node.position.x, node.position.y),
                node.config,
                node.ui,
            )
            for node in payload.nodes
        ),
        edges=tuple(
            DomainWorkflowEdge(
                edge.id,
                edge.source_node_id,
                edge.source_port,
                edge.target_node_id,
                edge.target_port,
            )
            for edge in payload.edges
        ),
    )


def execution_context(
    workflow: Workflow,
    session: Session,
    storage: StorageProvider,
    settings: Settings,
    cache: InMemoryExecutionCache,
    parameters: dict[str, ParameterValue] | None = None,
) -> ExecutionContext:
    definitions = tuple(ParameterDefinition.model_validate(item) for item in workflow.parameters)
    try:
        values = resolve_parameters(definitions, parameters or {})
    except ValueError as exc:
        raise ApplicationError("INVALID_PARAMETER", str(exc)) from exc
    return ExecutionContext(
        workflow.project_id,
        workflow.id,
        uuid.uuid4(),
        sources=ProjectSourceAccess(workflow.project_id, session, storage, cache),
        cache=cache,
        logger=default_execution_logger(),
        settings=settings,
        parameter_definitions=definitions,
        parameters=values,
    )
