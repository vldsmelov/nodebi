import uuid
from dataclasses import replace
from pathlib import Path

import polars as pl
import pytest
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
from app.domain.values import RowContext, TableValue
from app.domain.workflows import NodeInstance, Position, WorkflowEdge, WorkflowGraph
from app.services.execution import (
    ExecutionFailure,
    ExecutionPlanner,
    InMemoryExecutionCache,
    WorkflowExecutionService,
    cache_key,
)


class Config(BaseModel):
    value: int = 1


SCHEMA = DatasetSchema((ColumnSchema("value", "value", "Value", LogicalType.INTEGER, False),))


class CountingExecutor:
    def __init__(self, *, fail: bool = False) -> None:
        self.calls = 0
        self.fail = fail
        self.received_ports: set[str] = set()

    def validate(self, node, input_schemas, context):  # type: ignore[no-untyped-def]
        return ValidationResult()

    def infer_schema(self, node, input_schemas, context):  # type: ignore[no-untyped-def]
        return SCHEMA

    def execute(self, node, inputs, context):  # type: ignore[no-untyped-def]
        self.calls += 1
        self.received_ports = set(inputs)
        if self.fail:
            raise ValueError("deliberate failure")
        return next(iter(inputs.values()), Dataset(pl.DataFrame({"value": [1, 2]}), SCHEMA))


def make_definition(
    node_type: str,
    executor: CountingExecutor,
    inputs: tuple[str, ...] = (),
) -> NodeDefinition:
    return NodeDefinition(
        node_type,
        1,
        NodeCategory.SOURCE if not inputs else NodeCategory.TRANSFORM,
        node_type,
        node_type,
        tuple(PortDefinition(port, port, PortKind.DATASET) for port in inputs),
        (PortDefinition("output", "Output", PortKind.DATASET, False, None),),
        Config,
        SchemaInferenceMode.STATIC,
        executor,
    )


def make_node(number: int, node_type: str, value: int = 1) -> NodeInstance:
    return NodeInstance(uuid.UUID(int=number), node_type, 1, Position(0, 0), {"value": value})


def make_edge(number: int, source: int, target: int, port: str = "input") -> WorkflowEdge:
    return WorkflowEdge(
        uuid.UUID(int=number),
        uuid.UUID(int=source),
        "output",
        uuid.UUID(int=target),
        port,
    )


def test_planner_excludes_unrelated_invalid_branch() -> None:
    registry = NodeRegistry()
    registry.register(make_definition("source", CountingExecutor()))
    registry.register(make_definition("transform", CountingExecutor(), ("input",)))
    source = make_node(1, "source")
    target = make_node(2, "transform")
    unrelated = make_node(3, "transform")
    graph = WorkflowGraph(
        uuid.uuid4(),
        uuid.uuid4(),
        "Graph",
        1,
        (unrelated, target, source),
        (make_edge(10, 1, 2),),
    )

    plan = ExecutionPlanner(registry).plan(graph, target.id)

    assert plan.ordered_node_ids == (source.id, target.id)
    assert unrelated.id not in {node.id for node in plan.graph.nodes}


def test_execution_routes_two_inputs_and_reuses_content_cache(
    session: Session, tmp_path: Path
) -> None:
    left_executor = CountingExecutor()
    right_executor = CountingExecutor()
    join_executor = CountingExecutor()
    registry = NodeRegistry()
    registry.register(make_definition("left", left_executor))
    registry.register(make_definition("right", right_executor))
    registry.register(make_definition("join", join_executor, ("left", "right")))
    left, right, target = make_node(1, "left"), make_node(2, "right"), make_node(3, "join")
    graph = WorkflowGraph(
        uuid.uuid4(),
        uuid.uuid4(),
        "Graph",
        1,
        (target, right, left),
        (make_edge(10, 1, 3, "left"), make_edge(11, 2, 3, "right")),
    )
    cache = InMemoryExecutionCache(8)
    context = ExecutionContext(
        graph.project_id,
        graph.id,
        uuid.uuid4(),
        cache=cache,
    )
    service = WorkflowExecutionService(registry)

    first = service.execute(graph, target.id, context)
    second = service.execute(graph, target.id, context)

    assert join_executor.received_ports == {"left", "right"}
    assert first.output.row_count == 2
    assert second.metadata["cache_hits"] == 3
    assert (left_executor.calls, right_executor.calls, join_executor.calls) == (1, 1, 1)
    for result in (first, second):
        value = result.outputs["output"]
        assert isinstance(value, TableValue)
        assert value.dataset is result.output
        assert value.context == RowContext(graph.id, target.id, "output")


def test_cache_identity_changes_with_config_and_upstream() -> None:
    node = make_node(1, "source")
    assert cache_key(node, {}) == cache_key(node, {})
    assert cache_key(node, {}) != cache_key(make_node(1, "source", 2), {})
    assert cache_key(node, {"input": "a"}) != cache_key(node, {"input": "b"})


def test_execution_failure_is_attributed_to_node(session: Session, tmp_path: Path) -> None:
    registry = NodeRegistry()
    registry.register(make_definition("source", CountingExecutor(fail=True)))
    source = make_node(1, "source")
    graph = WorkflowGraph(uuid.uuid4(), uuid.uuid4(), "Graph", 1, (source,), ())
    context = ExecutionContext(graph.project_id, graph.id, uuid.uuid4(), None)

    with pytest.raises(ExecutionFailure) as captured:
        WorkflowExecutionService(registry).execute(graph, source.id, context)

    assert captured.value.node_id == source.id
    assert captured.value.category == "source"


def test_sink_preview_survives_named_output_adapter() -> None:
    registry = NodeRegistry()
    registry.register(replace(make_definition("sink", CountingExecutor()), output_ports=()))
    target = make_node(1, "sink")
    graph = WorkflowGraph(uuid.uuid4(), uuid.uuid4(), "Sink", 1, (target,), ())
    result = WorkflowExecutionService(registry).execute(
        graph, target.id, ExecutionContext(graph.project_id, graph.id, uuid.uuid4())
    )
    assert result.output.row_count == 2
    assert result.outputs == {}


def test_legacy_adapter_does_not_claim_to_return_scalar() -> None:
    registry = NodeRegistry()
    registry.register(
        replace(
            make_definition("source", CountingExecutor()),
            output_ports=(PortDefinition("output", "Scalar", PortKind.SCALAR, False, None),),
        )
    )
    target = make_node(1, "source")
    graph = WorkflowGraph(uuid.uuid4(), uuid.uuid4(), "Wrong contract", 1, (target,), ())
    with pytest.raises(ExecutionFailure, match="typed output routing"):
        WorkflowExecutionService(registry).execute(
            graph, target.id, ExecutionContext(graph.project_id, graph.id, uuid.uuid4())
        )
