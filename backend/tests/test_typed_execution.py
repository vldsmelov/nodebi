from dataclasses import replace
from uuid import uuid4

import polars as pl
import pytest
from pydantic import BaseModel

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
    TypedNodeExecutor,
)
from app.domain.parameters import ParameterDefinition
from app.domain.values import RowContext, ScalarValue, TableValue, ValueSchema
from app.domain.workflows import NodeInstance, Position, WorkflowEdge, WorkflowGraph
from app.nodes import get_node_registry
from app.services.execution import (
    ExecutionFailure,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)
from app.services.workflow_validation import WorkflowSchemaResolver


class Source:
    def __init__(self) -> None:
        self.loads = 0
        self.validations = 0
        self.dataset = Dataset(
            pl.DataFrame({"quantity": [2, 3, None], "price": [10, 20, 30]}),
            DatasetSchema(
                (
                    ColumnSchema("q", "quantity", "Quantity", LogicalType.INTEGER, True),
                    ColumnSchema("p", "price", "Price", LogicalType.INTEGER, False),
                )
            ),
        )

    def validate(self, *_args):  # type: ignore[no-untyped-def]
        self.validations += 1

    def identity(self, *_args):  # type: ignore[no-untyped-def]
        return "artifact"

    def schema(self, *_args):  # type: ignore[no-untyped-def]
        return self.dataset.schema

    def load(self, *_args):  # type: ignore[no-untyped-def]
        self.loads += 1
        return self.dataset


def node(kind, **config):  # type: ignore[no-untyped-def]
    return NodeInstance(uuid4(), kind, 1, Position(0, 0), config)


def edge(source, target, port, column=None, output="dataset"):  # type: ignore[no-untyped-def]
    return WorkflowEdge(uuid4(), source.id, output, target.id, port, column)


def setup():  # type: ignore[no-untyped-def]
    source = node("excel_source", source_id=str(uuid4()), sheet_name="Orders")
    multiply = node("field_arithmetic", operation="multiply")
    append = node("append_field", name="Revenue")
    total = node("field_sum")
    edges = (
        edge(source, multiply, "a", "q"),
        edge(source, multiply, "b", "p"),
        edge(source, append, "table"),
        edge(multiply, append, "value", output="value"),
        edge(append, total, "table"),
        edge(append, total, "value", f"calc_{append.id.hex}"),
    )
    graph = WorkflowGraph(uuid4(), uuid4(), "Typed", 2, (source, multiply, append, total), edges)
    access = Source()
    context = ExecutionContext(
        graph.project_id, graph.id, uuid4(), sources=access, cache=InMemoryExecutionCache()
    )
    return graph, context, access


def test_mixed_execution_field_preview_scalar_and_cache() -> None:
    graph, context, access = setup()
    source, multiply, append, total = graph.nodes
    engine = WorkflowExecutionService(get_node_registry())
    schema = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert schema.valid
    assert access.loads == 0
    assert (
        next(item for item in schema.nodes if item.node_id == multiply.id).outputs["value"].kind
        == "field"
    )
    assert engine.execute(graph, total.id, context).output.frame["value"].to_list() == [80.0]
    assert access.loads == 1
    assert engine.execute(graph, multiply.id, context, output_port="value").output.frame[
        "value"
    ].to_list() == [20.0, 60.0, None]
    warm = engine.execute(graph, total.id, context)
    assert warm.value_kind == "scalar"
    assert warm.output_port == "value"
    assert warm.metadata["cache_hits"] == 2
    assert access.loads == 1 and access.validations > 1
    appended = engine.execute(graph, append.id, context)
    assert appended.value_kind == "dataset"
    assert appended.output.schema.by_id(f"calc_{append.id.hex}").engine_name == "Revenue"
    with pytest.raises(ExecutionFailure) as failure:
        engine.execute(graph, source.id, context, output_port="value")
    assert failure.value.issues[0].code == "INVALID_OUTPUT_PORT"


def test_named_mixed_outputs_preserve_values_and_declared_default() -> None:
    graph, context, access = setup()
    source = graph.nodes[0]
    split = node("mixed_outputs")
    append = node("append_field", name="Count")

    class EmptyConfig(BaseModel):
        pass

    class MixedExecutor(TypedNodeExecutor):
        def infer_outputs(self, instance, inputs, ctx):  # type: ignore[no-untyped-def]
            return {
                "table": ValueSchema(
                    "dataset",
                    table=inputs["input"].table,
                    context=RowContext(ctx.workflow_id, instance.id, "table"),
                ),
                "count": ValueSchema("scalar", logical_type=LogicalType.INTEGER),
            }

        def execute_outputs(self, instance, inputs, ctx):  # type: ignore[no-untyped-def]
            dataset = inputs["input"].dataset
            # Deliberately reverse declaration order: the default is a contract,
            # not a consequence of dictionary insertion order.
            return {
                "count": ScalarValue(dataset.frame.height),
                "table": TableValue(RowContext(ctx.workflow_id, instance.id, "table"), dataset),
            }

    registry = get_node_registry()
    registry.register(
        NodeDefinition(
            "mixed_outputs",
            1,
            NodeCategory.TRANSFORM,
            "Mixed",
            "Test mixed ports",
            (PortDefinition("input", "Input", PortKind.DATASET),),
            (
                PortDefinition("table", "Table", PortKind.DATASET),
                PortDefinition("count", "Count", PortKind.SCALAR),
            ),
            EmptyConfig,
            SchemaInferenceMode.STATIC,
            MixedExecutor(),
            workflow_format=2,
        )
    )
    graph = replace(
        graph,
        nodes=(source, split, append),
        edges=(
            edge(source, split, "input"),
            edge(split, append, "table", output="table"),
            edge(split, append, "value", output="count"),
        ),
    )
    engine = WorkflowExecutionService(registry)
    for _ in range(2):
        default = engine.execute(graph, split.id, context)
        assert default.output_port == "table" and default.value_kind == "dataset"
        count = engine.execute(graph, split.id, context, output_port="count")
        assert count.value_kind == "scalar" and count.output.frame["value"].to_list() == [3]
        assert engine.execute(graph, append.id, context).output.frame["Count"].to_list() == [
            3,
            3,
            3,
        ]
    assert access.loads == 1


def test_identical_artifacts_on_different_nodes_cannot_align_by_position() -> None:
    graph, context, access = setup()
    source, multiply, *_ = graph.nodes
    other = replace(source, id=uuid4())
    graph = replace(
        graph,
        nodes=(*graph.nodes, other),
        edges=tuple(
            replace(wire, source_node_id=other.id)
            if wire.target_node_id == multiply.id and wire.target_port == "b"
            else wire
            for wire in graph.edges
        ),
    )
    with pytest.raises(ExecutionFailure) as failure:
        WorkflowExecutionService(get_node_registry()).execute(graph, multiply.id, context)
    assert failure.value.issues[0].node_id == multiply.id
    assert "different table outputs" in failure.value.issues[0].message
    assert access.loads == 0


def test_parameter_dependency_changes_only_dependent_table_cache() -> None:
    graph, context, access = setup()
    source, multiply, append, total = graph.nodes
    parameter = node("scalar_parameter", name="factor")
    graph = replace(
        graph,
        nodes=(*graph.nodes, parameter),
        edges=tuple(
            edge(parameter, multiply, "b", output="value")
            if wire.target_node_id == multiply.id and wire.target_port == "b"
            else wire
            for wire in graph.edges
        ),
    )
    context.parameter_definitions = (
        ParameterDefinition(name="factor", logical_type="float", default=2),
        ParameterDefinition(name="unused", logical_type="float", default=9),
    )
    engine = WorkflowExecutionService(get_node_registry())
    assert engine.execute(graph, total.id, context).output.frame.item() == 10
    context.parameters = {"factor": 3}
    assert engine.execute(graph, total.id, context).output.frame.item() == 15
    context.parameters = {"factor": 3, "unused": 100}
    result = engine.execute(graph, total.id, context)
    assert result.output.frame.item() == 15 and result.metadata["cache_hits"] == 2
    assert access.loads == 1


def test_mask_uses_new_table_context_and_old_group_by_still_runs() -> None:
    graph, context, access = setup()
    source, multiply, append, _ = graph.nodes
    threshold = node("scalar_constant", value=25)
    predicate = node("field_compare", operation="greater")
    mask = node("field_filter", null_policy="drop")
    group = node(
        "group_by",
        dimensions=[],
        aggregations=[{"column_id": f"calc_{append.id.hex}", "operation": "sum", "name": "Total"}],
    )
    graph = replace(
        graph,
        nodes=(*graph.nodes, threshold, predicate, mask, group),
        edges=(
            *graph.edges,
            edge(append, predicate, "a", f"calc_{append.id.hex}"),
            edge(threshold, predicate, "b", output="value"),
            edge(append, mask, "table"),
            edge(predicate, mask, "value", output="value"),
            edge(mask, group, "input"),
        ),
    )
    engine = WorkflowExecutionService(get_node_registry())
    assert engine.execute(graph, group.id, context).output.frame["Total"].to_list() == [60]
    assert access.loads == 1
    invalid = replace(
        graph,
        edges=tuple(
            replace(wire, source_node_id=source.id, source_column_id="q")
            if wire.target_node_id == predicate.id and wire.target_port == "a"
            else wire
            for wire in graph.edges
        ),
    )
    with pytest.raises(ExecutionFailure) as failure:
        engine.execute(invalid, mask.id, context)
    assert failure.value.issues[0].node_id == mask.id


def test_bad_numeric_type_is_rejected_before_loading() -> None:
    graph, context, access = setup()
    access.dataset = Dataset(
        pl.DataFrame({"quantity": ["2"], "price": [10]}),
        DatasetSchema(
            (
                replace(access.dataset.schema.columns[0], logical_type=LogicalType.STRING),
                access.dataset.schema.columns[1],
            )
        ),
    )
    with pytest.raises(ExecutionFailure) as failure:
        WorkflowExecutionService(get_node_registry()).execute(graph, graph.nodes[-1].id, context)
    assert "numeric" in failure.value.issues[0].message
    assert access.loads == 0


def test_division_error_and_explicit_null_survive_wiring() -> None:
    graph, context, access = setup()
    source, multiply, append, total = graph.nodes
    zero = node("scalar_constant", value=0)
    division = replace(multiply, config={"operation": "divide", "zero_policy": "error"})
    graph = replace(
        graph,
        nodes=(source, division, append, total, zero),
        edges=tuple(
            edge(zero, division, "b", output="value")
            if wire.target_node_id == division.id and wire.target_port == "b"
            else wire
            for wire in graph.edges
        ),
    )
    with pytest.raises(ExecutionFailure, match="division by zero") as failure:
        WorkflowExecutionService(get_node_registry()).execute(graph, append.id, context)
    assert failure.value.node_id == append.id
    safe = replace(division, config={"operation": "divide", "zero_policy": "null"})
    graph = replace(graph, nodes=(source, safe, append, total, zero))
    assert (
        WorkflowExecutionService(get_node_registry())
        .execute(graph, total.id, context)
        .output.frame.item()
        == 0
    )


def test_changed_field_projection_cannot_reuse_previous_calculation() -> None:
    graph, context, access = setup()
    source, multiply, append, total = graph.nodes
    engine = WorkflowExecutionService(get_node_registry())
    assert engine.execute(graph, total.id, context).output.frame.item() == 80
    graph = replace(
        graph,
        edges=tuple(
            replace(wire, source_column_id="q")
            if wire.target_node_id == multiply.id and wire.target_port == "b"
            else wire
            for wire in graph.edges
        ),
    )
    assert engine.execute(graph, total.id, context).output.frame.item() == 13
    assert access.loads == 1


def test_missing_field_identifies_connection_before_loading() -> None:
    graph, context, access = setup()
    wire = replace(graph.edges[0], source_column_id="removed")
    graph = replace(graph, edges=(wire, *graph.edges[1:]))
    with pytest.raises(ExecutionFailure) as failure:
        WorkflowExecutionService(get_node_registry()).execute(graph, graph.nodes[-1].id, context)
    issue = failure.value.issues[0]
    assert issue.code == "INVALID_FIELD_CONNECTION"
    assert issue.edge_id == wire.id and issue.node_id == wire.target_node_id and issue.field == "a"
    assert access.loads == 0


def test_warm_typed_result_does_not_bypass_source_access() -> None:
    from app.infrastructure.excel import ExcelWorkbookError

    graph, context, access = setup()
    engine = WorkflowExecutionService(get_node_registry())
    engine.execute(graph, graph.nodes[-1].id, context)

    def revoked(*_args):  # type: ignore[no-untyped-def]
        raise ExcelWorkbookError("Source is unavailable.")

    access.validate = revoked  # type: ignore[method-assign]
    with pytest.raises(ExecutionFailure) as failure:
        engine.execute(graph, graph.nodes[-1].id, context)
    assert "unavailable" in failure.value.issues[0].message
    assert access.loads == 1
