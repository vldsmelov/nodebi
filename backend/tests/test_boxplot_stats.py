import statistics
from dataclasses import replace
from decimal import Decimal
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue, ValueConnectionError, ValueSchema
from app.domain.workflows import NodeInstance, Position
from app.nodes.boxplot_stats import BoxPlotStatsExecutor

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def run(values, groups=None, *, dtype=pl.Int64, node_id=None, scale=0):
    numeric = (
        LogicalType.DECIMAL
        if isinstance(dtype, pl.Decimal)
        else LogicalType.FLOAT
        if dtype == pl.Float64
        else LogicalType.INTEGER
    )
    columns = [
        ColumnSchema(
            "v",
            "v",
            "Value",
            numeric,
            True,
            {"scale": scale, "currency": "RUB"} if numeric == LogicalType.DECIMAL else {},
        )
    ]
    frame = pl.DataFrame({"v": pl.Series(values, dtype=dtype)})
    config = {"value_column_id": "v"}
    if groups is not None:
        frame = frame.with_columns(pl.Series("g", groups, dtype=pl.String))
        columns.append(ColumnSchema("g", "g", "Group", LogicalType.STRING, True))
        config["group_column_id"] = "g"
    data = Dataset(frame, DatasetSchema(tuple(columns)))
    node = NodeInstance(node_id or uuid4(), "boxplot_stats", 1, Position(0, 0), config)
    executor = BoxPlotStatsExecutor()
    schemas = executor.infer_outputs(
        node, {"input": ValueSchema("dataset", table=data.schema)}, CONTEXT
    )
    results = executor.execute_outputs(
        node,
        {"input": TableValue(RowContext(CONTEXT.workflow_id, uuid4(), "dataset"), data)},
        CONTEXT,
    )
    for port, result in results.items():
        assert result.dataset.schema == schemas[port].table
    return {port: result.dataset for port, result in results.items()}


def test_independent_linear_quartiles_and_tukey_whiskers():
    population = [-100, 1, 2, 3, 4, 5, 6, 7, 8, 100]
    results = run(population)
    row = results["dataset"].frame.to_dicts()[0]
    assert [row[k] for k in ("q1", "median", "q3")] == [
        Decimal(str(q)) for q in statistics.quantiles(population, method="inclusive")
    ]
    assert (row["count"], row["missing_count"], row["outlier_count"]) == (10, 0, 2)
    assert (row["lower_whisker"], row["upper_whisker"]) == (1, 8)
    assert results["outliers"].frame["value"].to_list() == [-100, 100]


@pytest.mark.parametrize(
    "values,quartiles,count,missing",
    [
        ([], [None] * 3, 0, 0),
        ([None, None], [None] * 3, 0, 2),
        ([7], [7] * 3, 1, 0),
        ([7, 7, 7], [7] * 3, 3, 0),
        ([0, None, 0], [0] * 3, 2, 1),
        ([-4, 4], [-2, 0, 2], 2, 0),
    ],
)
def test_empty_constant_negative_and_missing_populations(values, quartiles, count, missing):
    results = run(values)
    row = results["dataset"].frame.to_dicts()[0]
    assert [row[k] for k in ("q1", "median", "q3")] == quartiles
    assert row["count"] == count and row["missing_count"] == missing
    assert results["outliers"].row_count == 0


def test_exact_large_decimal_and_stable_identities_after_reordering():
    values = [Decimal("9007199254740993.11")] * 8 + [Decimal("9007199254740993.12")] * 2
    identity = uuid4()
    first = run(values, [None] * 10, dtype=pl.Decimal(38, 2), node_id=identity, scale=2)
    second = run(
        list(reversed(values)), [None] * 10, dtype=pl.Decimal(38, 2), node_id=identity, scale=2
    )
    assert first["dataset"].frame.equals(second["dataset"].frame)
    assert first["outliers"].frame.equals(second["outliers"].frame)
    assert first["outliers"].frame["point_id"].n_unique() == 2
    assert first["dataset"].frame["median"][0] == Decimal("9007199254740993.1100")
    assert first["dataset"].schema.by_name("median").metadata["currency"] == "RUB"


def test_exact_fence_is_included_and_groups_do_not_mix():
    result = run([0, 0, 0, 0, 2, 2, 2, 5, 6, None], ["A"] * 9 + ["B"])
    summary = result["dataset"].frame.to_dicts()
    assert summary[0]["upper_whisker"] == 5
    assert summary[1]["count"] == 0 and summary[1]["missing_count"] == 1
    assert result["outliers"].frame["value"].to_list() == [6]


@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf")])
def test_nonfinite_beyond_preview_is_not_ignored(value):
    with pytest.raises(ValueConnectionError, match="finite"):
        run([1.0] * 101 + [value], dtype=pl.Float64)


def test_float_quartiles_and_extreme_range_avoid_intermediate_overflow():
    result = run([-1e308, 1e308], dtype=pl.Float64)["dataset"].frame.to_dicts()[0]
    assert result["q1"] == -5e307 and result["median"] == 0 and result["q3"] == 5e307


def test_decimal_overflow_and_inconsistent_scale_fail_without_rounding():
    with pytest.raises(ValueConnectionError, match="precision"):
        run([Decimal("9" * 38)], dtype=pl.Decimal(38, 0))
    with pytest.raises(ValueConnectionError, match="precision"):
        run([Decimal("0.0001")], dtype=pl.Decimal(38, 4), scale=0)
    with pytest.raises(ValueConnectionError, match="0 to 36"):
        run([Decimal("0.1")], dtype=pl.Decimal(38, 37), scale=37)


def test_group_limit_and_empty_grouped_schema():
    with pytest.raises(ValueConnectionError, match="2000 groups"):
        run(list(range(2001)), [str(i) for i in range(2001)])
    result = run([], [])
    assert result["dataset"].row_count == result["outliers"].row_count == 0


def test_schema_errors_are_attributed_to_fields():
    node = NodeInstance(uuid4(), "boxplot_stats", 1, Position(0, 0), {"value_column_id": "v"})
    column = ColumnSchema("v", "v", "Text", LogicalType.STRING, True)
    with pytest.raises(ValueConnectionError, match="numeric") as error:
        BoxPlotStatsExecutor().infer_outputs(
            node, {"input": ValueSchema("dataset", table=DatasetSchema((column,)))}, CONTEXT
        )
    assert error.value.field == "config.value_column_id"
    with pytest.raises(ValueConnectionError, match="unavailable"):
        BoxPlotStatsExecutor().infer_outputs(
            node,
            {
                "input": ValueSchema(
                    "dataset", table=DatasetSchema((replace(column, column_id="removed"),))
                )
            },
            CONTEXT,
        )
