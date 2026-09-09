import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PositionPayload(BaseModel):
    x: float
    y: float


class NodePayload(BaseModel):
    id: uuid.UUID
    type: str = Field(min_length=1, max_length=100)
    version: int = Field(ge=1)
    position: PositionPayload
    config: dict[str, Any] = Field(default_factory=dict)
    ui: dict[str, Any] = Field(default_factory=dict)


class EdgePayload(BaseModel):
    id: uuid.UUID
    source_node_id: uuid.UUID
    source_port: str = Field(min_length=1, max_length=100)
    target_node_id: uuid.UUID
    target_port: str = Field(min_length=1, max_length=100)


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class WorkflowSave(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    nodes: list[NodePayload]
    edges: list[EdgePayload]


class WorkflowRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    version: int
    nodes: list[NodePayload]
    edges: list[EdgePayload]
    created_at: datetime
    updated_at: datetime


class WorkflowSummary(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    version: int


class WorkflowList(BaseModel):
    items: list[WorkflowSummary]


class PortRead(BaseModel):
    id: str
    display_name: str
    kind: str
    required: bool
    max_connections: int | None


class NodeDefinitionRead(BaseModel):
    type: str
    version: int
    category: str
    display_name: str
    description: str
    icon: str | None
    input_ports: list[PortRead]
    output_ports: list[PortRead]


class NodeCatalogRead(BaseModel):
    items: list[NodeDefinitionRead]


class GraphIssueRead(BaseModel):
    code: str
    message: str
    severity: str
    node_id: uuid.UUID | None
    edge_id: uuid.UUID | None
    field: str | None


class ResolvedColumnRead(BaseModel):
    column_id: str
    engine_name: str
    display_name: str
    logical_type: str
    nullable: bool
    metadata: dict[str, Any]


class NodeSchemaRead(BaseModel):
    node_id: uuid.UUID
    columns: list[ResolvedColumnRead] | None
    issues: list[GraphIssueRead]


class WorkflowSchemaRead(BaseModel):
    valid: bool
    nodes: list[NodeSchemaRead]
    issues: list[GraphIssueRead]


class PreviewRequest(BaseModel):
    limit: int = Field(default=100, ge=1, le=10_000)


class PreviewRead(BaseModel):
    execution_id: uuid.UUID
    node_id: uuid.UUID
    status: str
    columns: list[ResolvedColumnRead]
    rows: list[dict[str, Any]]
    returned_rows: int
    total_rows: int
    truncated: bool
    duration_ms: float
    metadata: dict[str, Any]
    warnings: list[str]
