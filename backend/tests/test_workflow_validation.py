import uuid
from pathlib import Path

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    NodeRegistry,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
    ValidationResult,
)
from app.domain.workflows import NodeInstance, Position, WorkflowEdge, WorkflowGraph
from app.infrastructure.storage import LocalStorageProvider
from app.services.workflow_validation import (
    WorkflowGraphValidator,
    WorkflowSchemaResolver,
    topological_order,
)


class EmptyConfig(BaseModel):
    pass


SCHEMA = DatasetSchema((ColumnSchema("amount", "amount", "Amount", LogicalType.FLOAT, False),))


class SchemaExecutor:
    def validate(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> ValidationResult:
        del node, input_schemas, context
        return ValidationResult()

    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        del node, context
        return input_schemas.get("input", SCHEMA)

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        raise NotImplementedError


def definition(
    node_type: str, *, source: bool = False, mode: SchemaInferenceMode = SchemaInferenceMode.STATIC
) -> NodeDefinition:
    return NodeDefinition(
        type=node_type,
        version=1,
        category=NodeCategory.SOURCE if source else NodeCategory.TRANSFORM,
        display_name=node_type,
        description=node_type,
        input_ports=() if source else (PortDefinition("input", "Input", PortKind.DATASET),),
        output_ports=(
            PortDefinition(
                "output", "Output", PortKind.DATASET, required=False, max_connections=None
            ),
        ),
        config_schema=EmptyConfig,
        schema_inference_mode=mode,
        executor=SchemaExecutor(),
    )


def node(number: int, node_type: str) -> NodeInstance:
    return NodeInstance(uuid.UUID(int=number), node_type, 1, Position(0, 0), {})


def edge(number: int, source: int, target: int) -> WorkflowEdge:
    return WorkflowEdge(
        uuid.UUID(int=number), uuid.UUID(int=source), "output", uuid.UUID(int=target), "input"
    )


def graph(nodes: tuple[NodeInstance, ...], edges: tuple[WorkflowEdge, ...]) -> WorkflowGraph:
    return WorkflowGraph(uuid.uuid4(), uuid.uuid4(), "Test", 1, nodes, edges)


def registry() -> NodeRegistry:
    result = NodeRegistry()
    result.register(definition("source", source=True))
    result.register(definition("transform"))
    return result


def test_validator_detects_missing_input_bad_ports_and_duplicate_ids() -> None:
    source = node(1, "source")
    transform = node(2, "transform")
    invalid_port = WorkflowEdge(uuid.UUID(int=10), source.id, "missing", transform.id, "input")
    result = WorkflowGraphValidator(registry()).validate(
        graph((source, transform, transform), (invalid_port,))
    )

    codes = {issue.code for issue in result.issues}
    assert {"DUPLICATE_NODE_ID", "INVALID_EDGE_PORT", "MISSING_REQUIRED_INPUT"} <= codes
    assert not result.valid


def test_cycle_detection_and_topological_order_are_deterministic() -> None:
    first, second, third = node(3, "transform"), node(1, "transform"), node(2, "transform")
    assert topological_order((first, second, third), ()) == (second.id, third.id, first.id)

    cyclic = graph((first, second), (edge(20, 3, 1), edge(21, 1, 3)))
    result = WorkflowGraphValidator(registry()).validate(cyclic)
    assert [issue.code for issue in result.issues].count("CYCLE_DETECTED") == 2


def test_schema_resolver_propagates_schema_per_node(session: Session, tmp_path: Path) -> None:
    source, transform = node(1, "source"), node(2, "transform")
    workflow = graph((transform, source), (edge(10, 1, 2),))
    context = ExecutionContext(
        workflow.project_id, workflow.id, uuid.uuid4(), session, LocalStorageProvider(tmp_path)
    )

    result = WorkflowSchemaResolver(registry()).resolve(workflow, context)

    assert result.valid
    assert [item.node_id for item in result.nodes] == [source.id, transform.id]
    assert result.nodes[1].schema == SCHEMA


def test_unknown_until_execution_returns_warning(session: Session, tmp_path: Path) -> None:
    custom_registry = NodeRegistry()
    custom_registry.register(
        definition("unknown", source=True, mode=SchemaInferenceMode.UNKNOWN_UNTIL_EXECUTION)
    )
    source = node(1, "unknown")
    workflow = graph((source,), ())
    context = ExecutionContext(
        workflow.project_id, workflow.id, uuid.uuid4(), session, LocalStorageProvider(tmp_path)
    )

    result = WorkflowSchemaResolver(custom_registry).resolve(workflow, context)

    assert result.valid
    assert result.nodes[0].schema is None
    assert result.issues[0].code == "SCHEMA_UNKNOWN_UNTIL_EXECUTION"
    assert result.issues[0].severity == "warning"
