import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Position:
    x: float
    y: float


@dataclass(frozen=True)
class NodeInstance:
    id: uuid.UUID
    type: str
    version: int
    position: Position
    config: dict[str, Any]
    ui: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class WorkflowEdge:
    id: uuid.UUID
    source_node_id: uuid.UUID
    source_port: str
    target_node_id: uuid.UUID
    target_port: str
    source_column_id: str | None = None


@dataclass(frozen=True)
class WorkflowGraph:
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    version: int
    nodes: tuple[NodeInstance, ...] = ()
    edges: tuple[WorkflowEdge, ...] = ()
