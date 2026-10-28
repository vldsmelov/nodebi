from datetime import date
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue, ValueConnectionError, ValueSchema
from app.domain.workflows import NodeInstance, Position
from app.nodes.heatmap import HeatmapConfig, HeatmapExecutor

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def run(rows, *, dtype=pl.Int64, x_dtype=pl.String, y_dtype=pl.String, node_id=None, **config):
    kind = (
        LogicalType.DECIMAL
        if isinstance(dtype, pl.Decimal)
        else LogicalType.FLOAT
        if dtype == pl.Float64
        else LogicalType.INTEGER
    )
    kinds = {
        pl.String: LogicalType.STRING,
        pl.Int64: LogicalType.INTEGER,
        pl.Boolean: LogicalType.BOOLEAN,
        pl.Date: LogicalType.DATE,
        pl.Float64: LogicalType.FLOAT,
    }
    schema = DatasetSchema(
        (
            ColumnSchema("x", "a", "X", kinds[x_dtype], True),
            ColumnSchema("y", "b", "Y", kinds[y_dtype], True),
            ColumnSchema(
                "v",
                "v",
                "Value",
                kind,
                True,
                {"scale": dtype.scale, "currency": "RUB"} if isinstance(dtype, pl.Decimal) else {},
            ),
        )
    )
    source = Dataset(
        pl.DataFrame(rows, schema={"a": x_dtype, "b": y_dtype, "v": dtype}, orient="row"), schema
    )
    node = NodeInstance(
        node_id or uuid4(),
        "heatmap_stats",
        1,
        Position(0, 0),
        {
            "x_column_id": "x",
            "y_column_id": "y",
            "value_column_id": "v",
            "aggregation": "sum",
            **config,
        },
    )
    executor = HeatmapExecutor()
    inferred = executor.infer_outputs(
        node, {"input": ValueSchema("dataset", table=schema)}, CONTEXT
    )
    result = executor.execute_outputs(
        node,
        {"input": TableValue(RowContext(CONTEXT.workflow_id, uuid4(), "dataset"), source)},
        CONTEXT,
    )["dataset"].dataset
    assert result.schema == inferred["dataset"].table
    return result


@pytest.mark.parametrize(
    "operation,expected",
    [("sum", "6"), ("average", "3.000000"), ("min", "2"), ("max", "4"), ("count", 2)],
)
def test_explicit_aggregation_and_distinct_missing_states(operation, expected):
    result = run(
        [("A", "One", 2), ("A", "One", 4), ("A", "One", None), ("B", "One", 0), ("B", "Two", None)],
        aggregation=operation,
    )
    rows = {(r["x"], r["y"]): r for r in result.frame.to_dicts()}
    assert rows["A", "One"]["value"] == (
        expected if isinstance(expected, int) else Decimal(expected)
    )
    assert (
        rows["A", "One"]["row_count"],
        rows["A", "One"]["valid_count"],
        rows["A", "One"]["missing_count"],
    ) == (3, 2, 1)
    assert rows["B", "One"]["value"] == (1 if operation == "count" else 0)
    assert rows["B", "Two"]["present"] is True
    assert rows["B", "Two"]["value"] == (0 if operation == "count" else None)
    assert rows["B", "Two"]["missing_count"] == 1
    assert rows["A", "Two"]["present"] is False and rows["A", "Two"]["value"] is None
    assert (
        rows["A", "Two"]["row_count"]
        == rows["A", "Two"]["valid_count"]
        == rows["A", "Two"]["missing_count"]
        == 0
    )


def test_exact_large_values_cancellation_and_reorder_identity():
    identity = uuid4()
    rows = [
        ("A", "One", Decimal("9007199254740993.11")),
        ("A", "One", Decimal("-9007199254740993.10")),
        (None, "One", Decimal("0.01")),
    ]
    with localcontext() as context:
        context.prec = 2  # Neither global Decimal context nor Float64 may affect exact sums.
        first = run(rows, dtype=pl.Decimal(38, 2), node_id=identity)
        second = run(rows[::-1], dtype=pl.Decimal(38, 2), node_id=identity)
    assert first.frame.equals(second.frame)
    assert first.frame["value"].to_list() == [Decimal("0.01"), Decimal("0.01")]
    assert first.schema.by_name("value").metadata["currency"] == "RUB"
    counted = run(rows, dtype=pl.Decimal(38, 2), aggregation="count")
    assert "currency" not in counted.schema.by_name("value").metadata


@pytest.mark.parametrize(
    "raw,expected", [("1.005", "1.00"), ("1.015", "1.02"), ("-1.015", "-1.02")]
)
def test_average_rounds_half_even_once(raw, expected):
    result = run(
        [("A", "B", Decimal(raw)), ("A", "B", None)],
        dtype=pl.Decimal(38, 3),
        aggregation="average",
        average_scale=2,
    )
    assert str(result.frame["value"][0]) == expected


def test_empty_null_and_real_null_label_categories_do_not_collide():
    assert run([]).row_count == 0
    result = run([(None, None, None), ("null", None, 1), ("", None, 2)])
    assert result.row_count == 3 and result.frame["cell_id"].n_unique() == 3
    assert result.frame["present"].to_list() == [True, True, True]
    assert result.frame["value"].to_list() == [Decimal(2), Decimal(1), None]


def test_typed_date_boolean_and_unsafe_integer_axes():
    dates = run(
        [(date(2026, 1, 1), False, 1), (None, True, 2)], x_dtype=pl.Date, y_dtype=pl.Boolean
    )
    assert dates.row_count == 4 and dates.schema.by_name("x").logical_type == LogicalType.DATE
    integers = run([(9007199254740992, "A", 1), (9007199254740993, "A", 2)], x_dtype=pl.Int64)
    assert integers.frame["x_id"].n_unique() == 2


def test_all_rows_beyond_preview_are_aggregated():
    result = run([("A", "B", 1)] * 100_000 + [("A", "B", 17)])
    assert result.frame["value"][0] == 100017
    assert result.frame["row_count"][0] == 100001


@pytest.mark.parametrize(
    "rows", [[(str(i), "A", 1) for i in range(201)], [(str(i), str(i), 1) for i in range(101)]]
)
def test_axis_and_matrix_limits_fail_instead_of_truncating(rows):
    with pytest.raises(ValueConnectionError, match="10000 cells"):
        run(rows)


def test_float_cancellation_average_and_output_overflow():
    rows = [("A", "B", 1e308), ("A", "B", 1e308), ("A", "B", -1e308)]
    assert run(rows, dtype=pl.Float64).frame["value"][0] == 1e308
    assert run(rows[:2], dtype=pl.Float64, aggregation="average").frame["value"][0] == 1e308
    with pytest.raises(ValueConnectionError, match="numeric range"):
        run(rows[:2], dtype=pl.Float64)


@pytest.mark.parametrize("value", [float("inf"), float("-inf"), float("nan")])
def test_nonfinite_is_rejected_even_for_count(value):
    with pytest.raises(ValueConnectionError, match="finite"):
        run([("A", "B", value)], dtype=pl.Float64, aggregation="count")


def test_decimal_overflow_fails():
    with pytest.raises(ValueConnectionError, match="decimal precision"):
        run([("A", "B", Decimal("9" * 38))] * 2, dtype=pl.Decimal(38, 0))


@pytest.mark.parametrize("config", [{"x_column_id": "unavailable"}, {"value_column_id": "absent"}])
def test_unavailable_field_has_domain_error_not_runtime_error(config):
    with pytest.raises(ValueConnectionError, match="unavailable"):
        run([], **config)


def test_float_dimension_rejected():
    with pytest.raises(ValueConnectionError, match="dimensions"):
        run([], x_dtype=pl.Float64)


@pytest.mark.parametrize(
    "patch",
    [
        {"aggregation": None},
        {"aggregation": "median"},
        {"x_column_id": "y"},
        {"value_column_id": "x"},
        {"average_scale": True},
        {"average_scale": 19},
    ],
)
def test_invalid_config(patch):
    with pytest.raises(ValueError):
        HeatmapConfig.model_validate(
            {
                "x_column_id": "x",
                "y_column_id": "y",
                "value_column_id": "v",
                "aggregation": "sum",
                **patch,
            }
        )


def test_aggregation_is_required_not_implicitly_sum():
    with pytest.raises(ValueError, match="aggregation"):
        HeatmapConfig(x_column_id="x", y_column_id="y", value_column_id="v")
