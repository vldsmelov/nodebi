from dataclasses import replace
from unittest.mock import Mock
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext, NodeRegistry, ValidationResult
from app.domain.workflows import NodeInstance, Position, WorkflowEdge, WorkflowGraph
from app.nodes import get_node_registry
from app.nodes.excel_source import excel_source_definition
from app.nodes.pivot import pivot_definition
from app.nodes.select_columns import select_columns_definition
from app.services.execution import InMemoryExecutionCache, WorkflowExecutionService
from app.services.workflow_validation import WorkflowSchemaResolver

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def dataset(keys: list[int | None], values: list[str | None]) -> Dataset:
    return Dataset(
        pl.DataFrame({"key": keys, "value": values}, schema={"key": pl.Int64, "value": pl.String}),
        DatasetSchema(
            (
                ColumnSchema("key", "key", "Key", LogicalType.INTEGER, True),
                ColumnSchema("value", "value", "Value", LogicalType.STRING, True),
            )
        ),
    )


def execute(kind: str, config: dict, inputs: dict[str, Dataset]) -> Dataset:
    node = NodeInstance(uuid4(), kind, 1, Position(0, 0), config)
    executor = get_node_registry().get(kind, 1).executor
    result = executor.execute(node, inputs, CONTEXT)
    if kind != "pivot":
        assert result.schema == executor.infer_schema(
            node, {p: d.schema for p, d in inputs.items()}, CONTEXT
        )
    return result


def test_join_nulls_unmatched_rows_duplicate_keys_and_column_identity() -> None:
    left = dataset([1, 2, None], ["left1", "left2", "null"])
    right = dataset([1, 1, None], ["right1", "right2", "null"])
    config = {"left_key": "key", "right_key": "key", "how": "left"}
    result = execute("join", config, {"left": left, "right": right})
    assert result.frame.columns == ["key", "value", "key__right", "value__right"]
    assert result.frame["value__right"].to_list() == ["right1", "right2", None, None]
    assert result.schema.columns[:2] == left.schema.columns
    assert all(c.nullable for c in result.schema.columns[2:])
    assert len({c.column_id for c in result.schema.columns}) == 4
    assert (
        execute("join", {**config, "how": "inner"}, {"left": left, "right": right}).row_count == 2
    )
    assert execute("join", config, {"left": left, "right": dataset([], [])}).row_count == 3


def test_join_rejects_expansion_before_materializing_and_mismatched_keys() -> None:
    large = dataset([1] * 600, ["a"] * 600)
    with pytest.raises(NodeExecutionError, match="limit"):
        execute("join", {"left_key": "key", "right_key": "key"}, {"left": large, "right": large})
    with pytest.raises(ValueError, match="matching logical types"):
        execute("join", {"left_key": "key", "right_key": "value"}, {"left": large, "right": large})


@pytest.mark.parametrize("how", ["inner", "left"])
def test_join_diagnostics_distinguish_records_matches_and_expansion(how: str) -> None:
    left = dataset([1, 1, 2, None], ["a", "b", "c", "d"])
    right = dataset([1, 1, 1, 3, None], ["a", "b", "c", "d", "e"])
    output = execute(
        "join", {"left_key": "key", "right_key": "key", "how": how}, {"left": left, "right": right}
    )
    stats = output.metadata["join_diagnostics"]
    assert stats["left_rows"] == 4 and stats["right_rows"] == 5
    assert stats["matched_left_rows"] == 2 and stats["matched_right_rows"] == 3
    assert stats["unmatched_left_rows"] == stats["unmatched_right_rows"] == 2
    assert stats["left_duplicate_keys"] == stats["right_duplicate_keys"] == 1
    assert stats["multiplied_left_rows"] == 2
    assert stats["additional_rows"] == 4
    assert stats["dropped_left_rows"] == (2 if how == "inner" else 0)
    assert stats["result_rows"] == output.row_count == (6 if how == "inner" else 8)


@pytest.mark.parametrize(
    "left_keys,right_keys", [([], []), ([None, None], []), ([], [1, 1]), ([1], [2])]
)
def test_join_diagnostics_empty_inputs(left_keys: list, right_keys: list) -> None:
    inputs = {
        "left": dataset(left_keys, [None] * len(left_keys)),
        "right": dataset(right_keys, [None] * len(right_keys)),
    }
    output = execute("join", {"left_key": "key", "right_key": "key", "how": "left"}, inputs)
    stats = output.metadata["join_diagnostics"]
    assert (
        stats["matched_left_rows"] == stats["matched_right_rows"] == stats["additional_rows"] == 0
    )
    assert stats["unmatched_left_rows"] == len(left_keys)
    assert stats["unmatched_right_rows"] == len(right_keys)
    assert stats["result_rows"] == len(left_keys)


def test_union_matches_names_in_left_order_and_rejects_incompatible_schemas() -> None:
    left = dataset([1], ["a"])
    normal_right = dataset([2], ["b"])
    right = Dataset(
        normal_right.frame.select("value", "key"),
        DatasetSchema(tuple(reversed(normal_right.schema.columns))),
    )
    result = execute("union", {}, {"left": left, "right": right})
    assert result.frame.to_dicts() == [{"key": 1, "value": "a"}, {"key": 2, "value": "b"}]
    assert execute("union", {}, {"left": dataset([], []), "right": right}).row_count == 1
    with pytest.raises(ValueError, match="matching field names"):
        execute("union", {}, {"left": left, "right": Dataset(pl.DataFrame(), DatasetSchema(()))})


def pivot_source() -> Dataset:
    return Dataset(
        pl.DataFrame(
            {
                "index": ["A", "A", "B", "A"],
                "category": ["x", None, "x", "(empty)"],
                "value": [2.0, 3.0, 4.0, 5.0],
            }
        ),
        DatasetSchema(
            (
                ColumnSchema("i", "index", "Index", LogicalType.STRING, False),
                ColumnSchema("p", "category", "Category", LogicalType.STRING, True),
                ColumnSchema("v", "value", "Value", LogicalType.FLOAT, False),
            )
        ),
    )


def test_pivot_values_collisions_nulls_and_empty_schema() -> None:
    source = pivot_source()
    config = {
        "index_column_id": "i",
        "pivot_column_id": "p",
        "value_column_id": "v",
        "operation": "sum",
    }
    result = execute("pivot", config, {"input": source})
    assert result.frame.columns == ["index", "pivot_x", "pivot_(empty)", "pivot_(empty)__2"]
    assert result.frame.row(0) == ("A", 2.0, 3.0, 5.0)
    assert result.frame.row(1) == ("B", 4.0, None, None)
    assert len({c.column_id for c in result.schema.columns}) == 4
    empty = execute("pivot", config, {"input": Dataset(source.frame.head(0), source.schema)})
    assert empty.row_count == 0 and empty.frame.columns == ["index"]


@pytest.mark.parametrize(
    ("operation", "expected"), [("count", 1), ("average", 2.0), ("min", 2.0), ("max", 2.0)]
)
def test_pivot_aggregations(operation: str, expected: float) -> None:
    result = execute(
        "pivot",
        {
            "index_column_id": "i",
            "pivot_column_id": "p",
            "value_column_id": "v",
            "operation": operation,
        },
        {"input": pivot_source()},
    )
    assert result.frame["pivot_x"][0] == expected


def test_pivot_schema_propagates_actual_values_to_downstream_and_reuses_execution() -> None:
    source = pivot_source()
    executor = Mock()
    executor.validate.return_value = ValidationResult()
    executor.infer_schema.return_value = source.schema
    executor.execute.return_value = source
    registry = NodeRegistry()
    registry.register(replace(excel_source_definition(), executor=executor, cache_identity=None))
    registry.register(pivot_definition())
    registry.register(select_columns_definition())
    source_node = NodeInstance(
        uuid4(),
        "excel_source",
        1,
        Position(0, 0),
        {"source_id": str(uuid4()), "sheet_name": "Sales"},
    )
    pivot = NodeInstance(
        uuid4(),
        "pivot",
        1,
        Position(0, 0),
        {
            "index_column_id": "i",
            "pivot_column_id": "p",
            "value_column_id": "v",
            "operation": "sum",
        },
    )
    initial = WorkflowGraph(
        uuid4(),
        uuid4(),
        "Pivot",
        1,
        (source_node, pivot),
        (WorkflowEdge(uuid4(), source_node.id, "dataset", pivot.id, "input"),),
    )
    context = ExecutionContext(
        initial.project_id, initial.id, uuid4(), cache=InMemoryExecutionCache()
    )
    resolved = WorkflowSchemaResolver(registry).resolve(initial, context)
    assert resolved.valid
    actual = resolved.nodes[-1].schema
    assert actual is not None and len(actual.columns) == 4
    selected = NodeInstance(
        uuid4(), "select_columns", 1, Position(0, 0), {"column_ids": [actual.columns[1].column_id]}
    )
    graph = replace(
        initial,
        nodes=(*initial.nodes, selected),
        edges=(*initial.edges, WorkflowEdge(uuid4(), pivot.id, "dataset", selected.id, "input")),
    )
    resolved = WorkflowSchemaResolver(registry).resolve(graph, context)
    assert resolved.valid
    result = WorkflowExecutionService(registry).execute(graph, selected.id, context)
    assert result.output.frame.columns == ["pivot_x"]
    assert result.output.frame["pivot_x"].to_list() == [2.0, 4.0]
    assert executor.execute.call_count == 1
