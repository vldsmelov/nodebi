import uuid
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from logging import Logger
from typing import TYPE_CHECKING, Protocol

from pydantic import BaseModel

from app.domain.datasets import Dataset, DatasetSchema
from app.domain.sources import SourceAccess
from app.domain.workflows import NodeInstance

if TYPE_CHECKING:
    from app.config import Settings


class ExecutionCache(Protocol):
    def get(self, key: str) -> Dataset | None: ...
    def put(self, key: str, value: Dataset) -> None: ...
    def get_or_load(self, key: str, loader: Callable[[], Dataset]) -> Dataset: ...


ConfigSchema = type[BaseModel]


class NodeCategory(StrEnum):
    SOURCE = "source"
    TRANSFORM = "transform"
    VISUALIZATION = "visualization"


class PortKind(StrEnum):
    DATASET = "dataset"


class SchemaInferenceMode(StrEnum):
    STATIC = "static"
    DATA_DEPENDENT = "data_dependent"
    UNKNOWN_UNTIL_EXECUTION = "unknown_until_execution"


@dataclass(frozen=True)
class PortDefinition:
    id: str
    display_name: str
    kind: PortKind
    required: bool = True
    max_connections: int | None = 1


@dataclass
class ExecutionContext:
    project_id: uuid.UUID
    workflow_id: uuid.UUID
    execution_id: uuid.UUID
    sources: SourceAccess | None = None
    cache: ExecutionCache | None = None
    logger: Logger | None = None
    settings: "Settings | None" = None


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    message: str
    field: str | None = None


@dataclass(frozen=True)
class ValidationResult:
    issues: tuple[ValidationIssue, ...] = ()

    @property
    def valid(self) -> bool:
        return not self.issues


class NodeExecutor(Protocol):
    def validate(
        self,
        node: NodeInstance,
        input_schemas: dict[str, DatasetSchema],
        context: ExecutionContext,
    ) -> ValidationResult: ...

    def infer_schema(
        self,
        node: NodeInstance,
        input_schemas: dict[str, DatasetSchema],
        context: ExecutionContext,
    ) -> DatasetSchema: ...

    def execute(
        self,
        node: NodeInstance,
        inputs: dict[str, Dataset],
        context: ExecutionContext,
    ) -> Dataset: ...


@dataclass(frozen=True)
class NodeDefinition:
    type: str
    version: int
    category: NodeCategory
    display_name: str
    description: str
    input_ports: tuple[PortDefinition, ...]
    output_ports: tuple[PortDefinition, ...]
    config_schema: ConfigSchema
    schema_inference_mode: SchemaInferenceMode
    executor: NodeExecutor
    icon: str | None = None
    cache_identity: Callable[[NodeInstance, ExecutionContext], str] | None = None


class UnknownNodeTypeError(KeyError):
    pass


class DuplicateNodeDefinitionError(ValueError):
    pass


class NodeRegistry:
    def __init__(self) -> None:
        self._definitions: dict[tuple[str, int], NodeDefinition] = {}

    def register(self, definition: NodeDefinition) -> None:
        key = (definition.type, definition.version)
        if key in self._definitions:
            raise DuplicateNodeDefinitionError(
                f"Node definition {definition.type}@{definition.version} is already registered."
            )
        self._definitions[key] = definition

    def get(self, node_type: str, version: int) -> NodeDefinition:
        try:
            return self._definitions[(node_type, version)]
        except KeyError as exc:
            raise UnknownNodeTypeError(f"Unknown node type {node_type}@{version}.") from exc

    def catalog(self) -> tuple[NodeDefinition, ...]:
        return tuple(self._definitions[key] for key in sorted(self._definitions))
