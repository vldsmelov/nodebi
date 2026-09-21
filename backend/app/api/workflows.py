import uuid
from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.domain.nodes import (
    NodeDefinition,
    NodeRegistry,
    PortDefinition,
)
from app.infrastructure.database import get_session
from app.infrastructure.storage import StorageProvider, get_storage_provider
from app.nodes import get_node_registry
from app.schemas.workflows import (
    GraphIssueRead,
    NodeCatalogRead,
    NodeDefinitionRead,
    NodeSchemaRead,
    NodeValuesRead,
    NodeValuesRequest,
    PortRead,
    PreviewRead,
    PreviewRequest,
    ResolvedColumnRead,
    RowContextRead,
    ValueSchemaRead,
    WorkflowCreate,
    WorkflowList,
    WorkflowRead,
    WorkflowSave,
    WorkflowSchemaRead,
    WorkflowSummary,
)
from app.services import workflows as workflow_service
from app.services.execution import (
    ExecutionFailure,
    InMemoryExecutionCache,
    WorkflowExecutionService,
    get_execution_cache,
)
from app.services.node_values import node_values
from app.services.workflow_validation import GraphIssue, WorkflowSchemaResolver
from app.services.workflows import (
    domain_graph as _domain_graph,
)
from app.services.workflows import (
    execution_context as _execution_context,
)
from app.services.workflows import get_workflow as _workflow
from app.services.workflows import (
    read_workflow,
    save_graph,
)

router = APIRouter(tags=["workflows"])
DatabaseSession = Annotated[Session, Depends(get_session)]
Registry = Annotated[NodeRegistry, Depends(get_node_registry)]
Storage = Annotated[StorageProvider, Depends(get_storage_provider)]
AppSettings = Annotated[Settings, Depends(get_settings)]
ExecutionCache = Annotated[InMemoryExecutionCache, Depends(get_execution_cache)]


@router.get("/api/v1/projects/{project_id}/workflows", response_model=WorkflowList)
def list_workflows(project_id: uuid.UUID, session: DatabaseSession) -> WorkflowList:
    items = workflow_service.list_workflows(session, project_id)
    return WorkflowList(
        items=[
            WorkflowSummary(
                parameters=item.parameters,
                id=item.id,
                project_id=item.project_id,
                name=item.name,
                version=item.version,
                revision=item.revision,
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
    return workflow_service.create_workflow(session, project_id, payload.name.strip())


@router.get("/api/v1/workflows/{workflow_id}", response_model=WorkflowRead)
def get_workflow(workflow_id: uuid.UUID, session: DatabaseSession) -> WorkflowRead:
    return read_workflow(session, _workflow(session, workflow_id))


def _issue_read(issue: GraphIssue) -> GraphIssueRead:
    return GraphIssueRead(
        code=issue.code,
        message=issue.message,
        severity=issue.severity,
        node_id=issue.node_id,
        edge_id=issue.edge_id,
        field=issue.field,
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
    return _resolve_schema(
        workflow_id, session, registry, storage, settings, cache, PreviewRequest()
    )


@router.post("/api/v1/workflows/{workflow_id}/schema", response_model=WorkflowSchemaRead)
def resolve_parameterized_schema(
    workflow_id: uuid.UUID,
    payload: PreviewRequest,
    session: DatabaseSession,
    registry: Registry,
    storage: Storage,
    settings: AppSettings,
    cache: ExecutionCache,
) -> WorkflowSchemaRead:
    return _resolve_schema(workflow_id, session, registry, storage, settings, cache, payload)


def _resolve_schema(
    workflow_id: uuid.UUID,
    session: DatabaseSession,
    registry: Registry,
    storage: Storage,
    settings: AppSettings,
    cache: ExecutionCache,
    payload: PreviewRequest,
) -> WorkflowSchemaRead:
    workflow = _workflow(session, workflow_id)
    graph = _domain_graph(session, workflow)
    context = _execution_context(workflow, session, storage, settings, cache, payload.parameters)
    result = WorkflowSchemaResolver(registry).resolve(graph, context)
    return WorkflowSchemaRead(
        revision=workflow.revision,
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
                outputs={
                    name: ValueSchemaRead(
                        kind=value.kind,
                        columns=[
                            ResolvedColumnRead(**column.to_dict()) for column in value.table.columns
                        ]
                        if value.table
                        else None,
                        logical_type=value.logical_type,
                        row_context=RowContextRead(**asdict(value.context))
                        if value.context
                        else None,
                        nullable=value.nullable,
                    )
                    for name, value in item.outputs.items()
                }
                if graph.version >= 2
                else None,
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
    graph = _domain_graph(session, workflow)
    context = _execution_context(workflow, session, storage, settings, cache, payload.parameters)
    try:
        result = WorkflowExecutionService(registry).execute(
            graph, node_id, context, output_port=payload.output_port
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
                "Unexpected workflow execution failure [%s]",
                str(context.execution_id),
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
        output_port=result.output_port if graph.version >= 2 else None,
        value_kind=result.value_kind if graph.version >= 2 else None,
        revision=workflow.revision,
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


@router.put("/api/v1/workflows/{workflow_id}", response_model=WorkflowRead)
def save_workflow(
    workflow_id: uuid.UUID, payload: WorkflowSave, session: DatabaseSession, registry: Registry
) -> WorkflowRead:
    workflow = _workflow(session, workflow_id)
    return save_graph(session, workflow, payload, registry)


@router.post(
    "/api/v1/workflows/{workflow_id}/nodes/{node_id}/values", response_model=NodeValuesRead
)
def get_node_values(
    workflow_id: uuid.UUID,
    node_id: uuid.UUID,
    payload: NodeValuesRequest,
    session: DatabaseSession,
    registry: Registry,
    storage: Storage,
    settings: AppSettings,
    cache: ExecutionCache,
) -> NodeValuesRead:
    return node_values(session, workflow_id, node_id, payload, registry, storage, settings, cache)


@router.delete("/api/v1/workflows/{workflow_id}", status_code=204)
def delete_workflow(workflow_id: uuid.UUID, session: DatabaseSession) -> Response:
    workflow_service.delete_workflow(session, workflow_id)
    return Response(status_code=204)


def _definition_read(definition: NodeDefinition) -> NodeDefinitionRead:
    def port(item: PortDefinition) -> PortRead:
        return PortRead(
            id=item.id,
            display_name=item.display_name,
            kind=item.kind.value,
            required=item.required,
            max_connections=item.max_connections,
            accepted_kinds=[kind.value for kind in item.accepted_kinds] or None,
        )

    return NodeDefinitionRead(
        type=definition.type,
        version=definition.version,
        category=definition.category.value,
        config_schema=definition.config_schema.model_json_schema(),
        schema_inference_mode=definition.schema_inference_mode.value,
        display_name=definition.display_name,
        description=definition.description,
        icon=definition.icon,
        input_ports=[port(item) for item in definition.input_ports],
        output_ports=[port(item) for item in definition.output_ports],
    )


@router.get("/api/v1/node-catalog", response_model=NodeCatalogRead)
def node_catalog(
    registry: Registry, format_version: Annotated[int, Query(ge=1, le=2)] = 1
) -> NodeCatalogRead:
    return NodeCatalogRead(
        items=[
            _definition_read(item)
            for item in registry.catalog()
            if item.workflow_format <= format_version
        ]
    )
