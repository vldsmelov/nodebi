import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.domain.nodes import (
    ExecutionContext,
    NodeDefinition,
    NodeRegistry,
    PortDefinition,
    UnknownNodeTypeError,
)
from app.domain.workflows import (
    NodeInstance,
    Position,
    WorkflowGraph,
)
from app.domain.workflows import (
    WorkflowEdge as DomainWorkflowEdge,
)
from app.infrastructure.database import get_session
from app.infrastructure.storage import StorageProvider, get_storage_provider
from app.models import Project, Workflow, WorkflowEdge, WorkflowNode
from app.nodes import get_node_registry
from app.repositories.sqlalchemy import SqlAlchemySourceRepository, SqlAlchemyWorkflowRepository
from app.schemas.workflows import (
    EdgePayload,
    GraphIssueRead,
    NodeCatalogRead,
    NodeDefinitionRead,
    NodePayload,
    NodeSchemaRead,
    PortRead,
    PositionPayload,
    PreviewRead,
    PreviewRequest,
    ResolvedColumnRead,
    WorkflowCreate,
    WorkflowList,
    WorkflowRead,
    WorkflowSave,
    WorkflowSchemaRead,
    WorkflowSummary,
)
from app.services.execution import (
    ExecutionFailure,
    InMemoryExecutionCache,
    WorkflowExecutionService,
    default_execution_logger,
    get_execution_cache,
)
from app.services.workflow_validation import GraphIssue, WorkflowSchemaResolver

router = APIRouter(tags=["workflows"])
DatabaseSession = Annotated[Session, Depends(get_session)]
Registry = Annotated[NodeRegistry, Depends(get_node_registry)]
Storage = Annotated[StorageProvider, Depends(get_storage_provider)]
AppSettings = Annotated[Settings, Depends(get_settings)]
ExecutionCache = Annotated[InMemoryExecutionCache, Depends(get_execution_cache)]


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={"code": "WORKFLOW_NOT_FOUND", "message": "Workflow does not exist."},
    )


def _read(session: Session, workflow: Workflow) -> WorkflowRead:
    nodes = session.scalars(
        select(WorkflowNode).where(WorkflowNode.workflow_id == workflow.id)
    ).all()
    edges = session.scalars(
        select(WorkflowEdge).where(WorkflowEdge.workflow_id == workflow.id)
    ).all()
    return WorkflowRead(
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


def _workflow(session: Session, workflow_id: uuid.UUID) -> Workflow:
    workflow = session.get(Workflow, workflow_id)
    if workflow is None:
        raise _not_found()
    return workflow


@router.get("/api/v1/projects/{project_id}/workflows", response_model=WorkflowList)
def list_workflows(project_id: uuid.UUID, session: DatabaseSession) -> WorkflowList:
    if session.get(Project, project_id) is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project does not exist."},
        )
    items = SqlAlchemyWorkflowRepository(session).list_for_project(project_id)
    return WorkflowList(
        items=[
            WorkflowSummary(
                id=item.id, project_id=item.project_id, name=item.name, version=item.version
            )
            for item in items
        ]
    )


@router.post(
    "/api/v1/projects/{project_id}/workflows", response_model=WorkflowRead, status_code=201
)
def create_workflow(
    project_id: uuid.UUID, payload: WorkflowCreate, session: DatabaseSession
) -> WorkflowRead:
    if session.get(Project, project_id) is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project does not exist."},
        )
    workflow = SqlAlchemyWorkflowRepository(session).add(
        Workflow(project_id=project_id, name=payload.name.strip())
    )
    session.commit()
    session.refresh(workflow)
    return _read(session, workflow)


@router.get("/api/v1/workflows/{workflow_id}", response_model=WorkflowRead)
def get_workflow(workflow_id: uuid.UUID, session: DatabaseSession) -> WorkflowRead:
    return _read(session, _workflow(session, workflow_id))


def _issue_read(issue: GraphIssue) -> GraphIssueRead:
    return GraphIssueRead(
        code=issue.code,
        message=issue.message,
        severity=issue.severity,
        node_id=issue.node_id,
        edge_id=issue.edge_id,
        field=issue.field,
    )


def _domain_graph(session: Session, workflow: Workflow) -> WorkflowGraph:
    payload = _read(session, workflow)
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


def _execution_context(
    workflow: Workflow,
    session: Session,
    storage: StorageProvider,
    settings: Settings,
    cache: InMemoryExecutionCache,
) -> ExecutionContext:
    return ExecutionContext(
        workflow.project_id,
        workflow.id,
        uuid.uuid4(),
        session,
        storage,
        source_repository=SqlAlchemySourceRepository(session),
        cache=cache,
        logger=default_execution_logger(),
        settings=settings,
    )


@router.get("/api/v1/workflows/{workflow_id}/schema", response_model=WorkflowSchemaRead)
def resolve_workflow_schema(
    workflow_id: uuid.UUID,
    session: DatabaseSession,
    registry: Registry,
    storage: Storage,
    settings: AppSettings,
    cache: ExecutionCache,
) -> WorkflowSchemaRead:
    workflow = _workflow(session, workflow_id)
    graph = _domain_graph(session, workflow)
    context = _execution_context(workflow, session, storage, settings, cache)
    result = WorkflowSchemaResolver(registry).resolve(graph, context)
    return WorkflowSchemaRead(
        valid=result.valid,
        nodes=[
            NodeSchemaRead(
                node_id=item.node_id,
                columns=(
                    [ResolvedColumnRead(**column.to_dict()) for column in item.schema.columns]
                    if item.schema
                    else None
                ),
                issues=[_issue_read(issue) for issue in item.issues],
            )
            for item in result.nodes
        ],
        issues=[_issue_read(issue) for issue in result.issues],
    )


@router.post(
    "/api/v1/workflows/{workflow_id}/nodes/{node_id}/preview",
    response_model=PreviewRead,
)
def preview_workflow_node(
    workflow_id: uuid.UUID,
    node_id: uuid.UUID,
    payload: PreviewRequest,
    session: DatabaseSession,
    registry: Registry,
    storage: Storage,
    settings: AppSettings,
    cache: ExecutionCache,
) -> PreviewRead:
    workflow = _workflow(session, workflow_id)
    context = _execution_context(workflow, session, storage, settings, cache)
    try:
        result = WorkflowExecutionService(registry).execute(
            _domain_graph(session, workflow), node_id, context
        )
    except ExecutionFailure as exc:
        raise HTTPException(
            status_code=422 if exc.category == "validation" else 400,
            detail={
                "code": exc.code,
                "message": exc.message,
                "category": exc.category,
                "execution_id": str(exc.execution_id),
                "node_id": str(exc.node_id) if exc.node_id else None,
                "issues": [_issue_read(issue).model_dump(mode="json") for issue in exc.issues],
            },
        ) from exc
    except Exception as exc:
        if context.logger:
            context.logger.exception(
                "Unexpected workflow execution failure",
                extra={"workflow_id": str(workflow.id), "node_id": str(node_id)},
            )
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_EXECUTION_ERROR",
                "message": "Workflow execution failed unexpectedly.",
                "category": "internal",
                "execution_id": str(context.execution_id),
                "node_id": str(node_id),
            },
        ) from exc
    limit = min(payload.limit, settings.max_preview_rows)
    rows = result.output.frame.head(limit).to_dicts()
    return PreviewRead(
        execution_id=result.execution_id,
        node_id=node_id,
        status=result.status.value,
        columns=[ResolvedColumnRead(**column.to_dict()) for column in result.schema.columns],
        rows=rows,
        returned_rows=len(rows),
        total_rows=result.output.row_count,
        truncated=result.output.row_count > len(rows),
        duration_ms=round(result.duration_ms, 3),
        metadata=result.metadata,
        warnings=list(result.warnings),
    )


def _validate_graph(payload: WorkflowSave, registry: NodeRegistry) -> None:
    node_ids = [node.id for node in payload.nodes]
    edge_ids = [edge.id for edge in payload.edges]
    if len(node_ids) != len(set(node_ids)) or len(edge_ids) != len(set(edge_ids)):
        raise HTTPException(
            status_code=422,
            detail={"code": "DUPLICATE_GRAPH_ID", "message": "Node and edge IDs must be unique."},
        )
    known = set(node_ids)
    for node in payload.nodes:
        try:
            registry.get(node.type, node.version)
        except UnknownNodeTypeError as exc:
            raise HTTPException(
                status_code=422,
                detail={"code": "INVALID_NODE", "message": str(exc), "node_id": str(node.id)},
            ) from exc
    for edge in payload.edges:
        if edge.source_node_id not in known or edge.target_node_id not in known:
            raise HTTPException(
                status_code=422,
                detail={"code": "INVALID_EDGE", "message": "Edge references a missing node."},
            )


@router.put("/api/v1/workflows/{workflow_id}", response_model=WorkflowRead)
def save_workflow(
    workflow_id: uuid.UUID, payload: WorkflowSave, session: DatabaseSession, registry: Registry
) -> WorkflowRead:
    workflow = _workflow(session, workflow_id)
    _validate_graph(payload, registry)
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
        SqlAlchemyWorkflowRepository(session).save_graph(workflow, nodes, edges)
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_GRAPH",
                "message": "Workflow graph could not be saved atomically.",
            },
        ) from exc
    session.refresh(workflow)
    return _read(session, workflow)


@router.delete("/api/v1/workflows/{workflow_id}", status_code=204)
def delete_workflow(workflow_id: uuid.UUID, session: DatabaseSession) -> Response:
    repository = SqlAlchemyWorkflowRepository(session)
    repository.delete(_workflow(session, workflow_id))
    session.commit()
    return Response(status_code=204)


def _definition_read(definition: NodeDefinition) -> NodeDefinitionRead:
    def port(item: PortDefinition) -> PortRead:
        return PortRead(
            id=item.id,
            display_name=item.display_name,
            kind=item.kind.value,
            required=item.required,
            max_connections=item.max_connections,
        )

    return NodeDefinitionRead(
        type=definition.type,
        version=definition.version,
        category=definition.category.value,
        display_name=definition.display_name,
        description=definition.description,
        icon=definition.icon,
        input_ports=[port(item) for item in definition.input_ports],
        output_ports=[port(item) for item in definition.output_ports],
    )


@router.get("/api/v1/node-catalog", response_model=NodeCatalogRead)
def node_catalog(registry: Registry) -> NodeCatalogRead:
    return NodeCatalogRead(items=[_definition_read(item) for item in registry.catalog()])
