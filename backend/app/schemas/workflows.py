import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.domain.parameters import ParameterDefinition, ParameterValue, ParameterValues
from app.domain.publications import ResultCatalog
from app.schemas.presentation import WorkflowPresentation


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
    source_column_id: str | None = Field(
        default=None, min_length=1, max_length=200, exclude_if=lambda value: value is None
    )


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def nonblank_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Workflow name must not be blank.")
        return value


class WorkflowSave(WorkflowCreate):
    result_catalog: ResultCatalog | None = None
    presentation: WorkflowPresentation | None = None
    expected_revision: int = Field(ge=1)
    format_version: Literal[1, 2, 3] = 1
    name: str = Field(min_length=1, max_length=200)
    nodes: list[NodePayload]
    edges: list[EdgePayload]
    parameters: list[ParameterDefinition] | None = Field(default=None, max_length=64)

    @model_validator(mode="before")
    @classmethod
    def preserve_new_format_fields(cls, value: Any) -> Any:
        # v1 retains its historical tolerance for read-response attributes in PUTs.
        # v2 must not silently discard capabilities absent from this server build.
        if isinstance(value, dict) and value.get("format_version") in (2, 3):
            items = [(value, set(cls.model_fields))]
            for key, model in (("nodes", NodePayload), ("edges", EdgePayload)):
                if isinstance(value.get(key), list):
                    items.extend((item, set(model.model_fields)) for item in value[key])
            for item, supported in items:
                if isinstance(item, dict) and item.keys() - supported:
                    raise ValueError("This server does not support all fields in the v2 draft.")
        return value

    @field_validator("parameters")
    @classmethod
    def unique_parameters(
        cls, value: list[ParameterDefinition] | None
    ) -> list[ParameterDefinition] | None:
        if value is not None and len({item.name for item in value}) != len(value):
            raise ValueError("Workflow parameter names must be unique.")
        return value


class WorkflowRead(BaseModel):
    result_catalog: ResultCatalog | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    presentation: WorkflowPresentation | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    parameters: list[ParameterDefinition] = Field(default_factory=list)
    revision: int
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    version: int
    nodes: list[NodePayload]
    edges: list[EdgePayload]
    created_at: datetime
    updated_at: datetime


class WorkflowSummary(BaseModel):
    parameters: list[ParameterDefinition] = Field(default_factory=list)
    revision: int
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
    accepted_kinds: list[str] | None = Field(default=None, exclude_if=lambda value: value is None)


class NodeDefinitionRead(BaseModel):
    type: str
    version: int
    category: Literal["source", "transform", "visualization"]
    config_schema: dict[str, Any]
    schema_inference_mode: Literal["static", "data_dependent", "unknown_until_execution"]
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
    severity: Literal["error", "warning"]
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


class RowContextRead(BaseModel):
    workflow_id: uuid.UUID
    node_id: uuid.UUID
    output_port: str


class ValueSchemaRead(BaseModel):
    kind: Literal["dataset", "field", "scalar"]
    columns: list[ResolvedColumnRead] | None = None
    logical_type: str | None = None
    row_context: RowContextRead | None = None
    nullable: bool


class NodeSchemaRead(BaseModel):
    node_id: uuid.UUID
    columns: list[ResolvedColumnRead] | None
    issues: list[GraphIssueRead]
    outputs: dict[str, ValueSchemaRead] | None = Field(
        default=None, exclude_if=lambda value: value is None
    )


class WorkflowSchemaRead(BaseModel):
    revision: int
    valid: bool
    nodes: list[NodeSchemaRead]
    issues: list[GraphIssueRead]


class PreviewRequest(BaseModel):
    output_port: str | None = Field(default=None, min_length=1, max_length=100)
    parameters: ParameterValues = Field(default_factory=dict)
    limit: int = Field(default=100, ge=1, le=10_000)


class NodeValuesRequest(PreviewRequest):
    column_id: str = Field(min_length=1, max_length=200)
    label_column_id: str | None = Field(default=None, min_length=1, max_length=200)
    selected_value: ParameterValue = None
    search: str = Field(default="", max_length=200)
    limit: int = Field(default=200, ge=1, le=1000)


class NodeValueChoice(BaseModel):
    value: ParameterValue
    label: ParameterValue


class NodeValuesRead(BaseModel):
    revision: int
    column: ResolvedColumnRead
    values: list[ParameterValue]
    choices: list[NodeValueChoice]
    selected: NodeValueChoice | None = None
    label_column: ResolvedColumnRead | None = None
    truncated: bool


class PreviewRead(BaseModel):
    output_port: str | None = Field(default=None, exclude_if=lambda value: value is None)
    value_kind: Literal["dataset", "field", "scalar"] | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    revision: int
    execution_id: uuid.UUID
    node_id: uuid.UUID
    status: Literal["succeeded"]
    columns: list[ResolvedColumnRead]
    rows: list[dict[str, Any]]
    returned_rows: int
    total_rows: int
    truncated: bool
    duration_ms: float
    metadata: dict[str, Any]
    warnings: list[str]
