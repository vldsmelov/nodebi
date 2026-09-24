from datetime import date
from uuid import uuid4

import polars as pl
import pytest
from test_combine_nodes import CONTEXT

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema
from app.domain.datasets import LogicalType as T
from app.domain.errors import NodeExecutionError
from app.domain.formulas import FormulaValidationError, compile_formula
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry


def source() -> Dataset:
    return Dataset(
        pl.DataFrame({"x": [10.0, -30.0, 50.0, None], "text": [" A 12 ", "B", None, "bad"]}),
        DatasetSchema(
            (
                ColumnSchema("x", "x", "x", T.FLOAT, True),
                ColumnSchema("text", "text", "text", T.STRING, True),
            )
        ),
    )


def evaluate(expression: str) -> list:
    data = source()
    compiled = compile_formula(expression, data.schema, allow_predicates=True)
    return data.frame.select(compiled.expression.alias("result"))["result"].to_list()


def test_typed_conditions_text_null_and_numeric_helpers() -> None:
    assert evaluate('if_else([x] > 0, "income", "other")') == ["income", "other", "income", "other"]
    assert evaluate("if_else(is_null([x]), 0, abs([x]))") == [10, 30, 50, 0]
    assert evaluate('contains(trim([text]), "A")') == [True, False, None, False]
    assert evaluate('replace([text], "A", "C")')[0] == " C 12 "
    assert evaluate('to_number(extract([text], "[0-9]+"))') == [12, None, None, None]
    assert evaluate("maximum([x], 0)") == [10, 0, 50, None]
    assert evaluate("round([x] / 3, 2)") == [3.33, -10, 16.67, None]
    assert evaluate('year(to_date("2026-02-03", "%Y-%m-%d"))') == [2026]
    assert evaluate('month(to_date("2026-02-03", "%Y-%m-%d"))') == [2]


@pytest.mark.parametrize(
    "expression",
    [
        "if_else([x], 1, 0)",
        'if_else([x] > 0, "text", 0)',
        "year([text])",
        "round([x], 99)",
        '__import__("os")',
        'replace([text], [text], "a")',
    ],
)
def test_invalid_functions_rejected_before_execution(expression: str) -> None:
    with pytest.raises(FormulaValidationError):
        evaluate(expression)


def test_ordered_window_and_calendar() -> None:
    calendar = get_node_registry().get("calendar", 1).executor
    node = NodeInstance(
        uuid4(), "calendar", 1, Position(0, 0), {"start": "2024-02-28", "end": "2024-03-01"}
    )
    assert calendar.execute(node, {}, CONTEXT).frame["Date"].to_list() == [
        date(2024, 2, 28),
        date(2024, 2, 29),
        date(2024, 3, 1),
    ]
    frame = pl.DataFrame(
        {"year": [2025, 2025, 2025, 2026], "month": [1, 2, 3, 1], "base": [10.0, -30.0, 50.0, 2.0]}
    )
    schema = DatasetSchema(
        tuple(
            ColumnSchema(name, name, name, T.FLOAT if name == "base" else T.INTEGER, False)
            for name in frame.columns
        )
    )
    data = Dataset(frame, schema)
    executor = get_node_registry().get("window", 2).executor
    config = {
        "partitions": ["year"],
        "order_by": [{"column_id": "month", "direction": "ascending"}],
        "column_id": "base",
        "name": "Result",
    }
    for operation, expected in [
        ("cumulative_sum", [10, -20, 30, 2]),
        ("cumulative_max", [10, 10, 50, 2]),
        ("previous", [None, 10, -30, None]),
    ]:
        node = NodeInstance(
            uuid4(), "window", 2, Position(0, 0), {**config, "operation": operation}
        )
        assert (
            executor.execute(node, {"input": data}, CONTEXT)
            .frame.sort(["year", "month"])["Result"]
            .to_list()
            == expected
        )
    node = NodeInstance(
        uuid4(),
        "window",
        2,
        Position(0, 0),
        {
            **config,
            "operation": "cumulative_sum",
            "order_by": [{"column_id": "year", "direction": "ascending"}],
        },
    )
    with pytest.raises(NodeExecutionError, match="ties"):
        executor.execute(node, {"input": data}, CONTEXT)


def test_series_require_distinct_numeric_fields_and_supported_chart() -> None:
    from app.nodes.visualization import VisualizationExecutor

    executor = VisualizationExecutor()
    config = {"category_column_id": "text", "value_column_id": "x"}
    for extra, kind in [("text", "bar_chart"), ("x", "line_chart"), ("x", "pie_chart")]:
        node = NodeInstance(
            uuid4(),
            kind,
            1,
            Position(0, 0),
            {**config, "additional_series": [{"column_id": extra}]},
        )
        with pytest.raises(ValueError):
            executor.infer_schema(node, {"input": source().schema}, CONTEXT)


def test_strict_formula_conversion_reports_actionable_error() -> None:
    node = NodeInstance(
        uuid4(),
        "calculated_column",
        1,
        Position(0, 0),
        {"name": "Number", "expression": "to_number([text])"},
    )
    with pytest.raises(NodeExecutionError, match="Convert Types"):
        get_node_registry().get("calculated_column", 1).executor.execute(
            node, {"input": source()}, CONTEXT
        )


def test_join_record_diagnostics_survive_cardinality_error_and_keep_nulls() -> None:
    from dataclasses import replace

    from test_execution import CountingExecutor, make_definition

    from app.domain.nodes import NodeRegistry
    from app.domain.workflows import WorkflowEdge, WorkflowGraph
    from app.services.join_records import join_records

    class Input(CountingExecutor):
        def __init__(self, values):
            super().__init__()
            self.values = values

        def execute(self, node, inputs, context):
            from test_execution import SCHEMA

            return Dataset(pl.DataFrame({"value": self.values}), SCHEMA)

    registry = NodeRegistry()
    for name, values in [("left", [1, 2, None, 1]), ("right", [1, 1, 3, None])]:
        registry.register(make_definition(name, Input(values)))
    registry.register(get_node_registry().get("join", 2))
    left = NodeInstance(uuid4(), "left", 1, Position(0, 0), {})
    right = replace(left, id=uuid4(), type="right")
    join = replace(
        left,
        id=uuid4(),
        type="join",
        version=2,
        config={
            "keys": [{"left_key": "value", "right_key": "value"}],
            "relationship": "one_to_one",
        },
    )
    graph = WorkflowGraph(
        uuid4(),
        uuid4(),
        "Diagnostics",
        1,
        (left, right, join),
        tuple(
            WorkflowEdge(uuid4(), node.id, "output", join.id, side)
            for side, node in [("left", left), ("right", right)]
        ),
    )
    for kind, expected in [
        ("left_unmatched", [2, None]),
        ("right_unmatched", [3, None]),
        ("left_duplicates", [1, 1]),
        ("right_duplicates", [1, 1]),
    ]:
        result = join_records(graph, join.id, kind, CONTEXT, registry)
        assert result.output.frame["value"].to_list() == expected
