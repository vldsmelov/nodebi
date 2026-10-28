from decimal import Decimal
from fractions import Fraction
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue, ValueConnectionError, ValueSchema
from app.domain.workflows import NodeInstance, Position
from app.nodes.histogram import HistogramConfig, HistogramExecutor, exact_text

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def run(values, *, dtype=pl.Int64, node_id=None, **config):
    kind = (
        LogicalType.DECIMAL
        if isinstance(dtype, pl.Decimal)
        else LogicalType.FLOAT
        if dtype == pl.Float64
        else LogicalType.INTEGER
    )
    source = Dataset(
        pl.DataFrame({"v": pl.Series(values, dtype=dtype)}),
        DatasetSchema((ColumnSchema("v", "v", "Value", kind, True),)),
    )
    node = NodeInstance(
        node_id or uuid4(), "histogram", 1, Position(0, 0), {"value_column_id": "v", **config}
    )
    executor = HistogramExecutor()
    schemas = executor.infer_outputs(
        node, {"input": ValueSchema("dataset", table=source.schema)}, CONTEXT
    )
    result = executor.execute_outputs(
        node,
        {"input": TableValue(RowContext(CONTEXT.workflow_id, uuid4(), "dataset"), source)},
        CONTEXT,
    )
    for port, value in result.items():
        assert value.dataset.schema == schemas[port].table
    return {port: value.dataset for port, value in result.items()}


def test_defaults_and_full_population_counts():
    result = run(range(100001))
    bins = result["dataset"].frame
    assert bins.height == 20
    assert bins["count"].to_list() == [5000] * 19 + [5001]
    assert result["summary"].frame["input_count"][0] == 100001
    assert bins["lower"][0] == "0" and bins["upper"][-1] == "100000"


def test_half_open_intervals_last_inclusive_and_outside_accounting():
    result = run([-1, 0, 1, 2, 3, 4, 5, None], bin_count=2, range_min="0", range_max="4")
    assert result["dataset"].frame["count"].to_list() == [2, 3]
    assert result["dataset"].frame["interval"].to_list() == ["[0; 2)", "[2; 4]"]
    assert result["summary"].frame.to_dicts()[0] == {
        "input_count": 8,
        "valid_count": 7,
        "missing_count": 1,
        "included_count": 5,
        "below_count": 1,
        "above_count": 1,
        "bin_count": 2,
        "range_min": "0",
        "range_max": "4",
    }


@pytest.mark.parametrize("values", [[], [None], [None, None]])
def test_empty_and_all_missing_automatic_and_explicit_ranges(values):
    automatic = run(values)
    assert automatic["dataset"].row_count == 0
    assert automatic["summary"].frame["missing_count"][0] == len(values)
    assert automatic["summary"].frame["range_min"][0] is None
    explicit = run(values, range_min="0", range_max="1")
    assert explicit["dataset"].row_count == 20
    assert explicit["dataset"].frame["count"].sum() == 0


def test_constant_population_has_one_degenerate_interval_without_invented_range():
    result = run([7, None, 7])
    assert result["dataset"].frame["interval"].to_list() == ["[7; 7]"]
    assert result["dataset"].frame["count"].to_list() == [2]


def test_large_exact_decimal_bins_do_not_collapse_and_ids_survive_reorder():
    values = [
        Decimal("9007199254740993.11"),
        Decimal("9007199254740993.12"),
        Decimal("9007199254740993.13"),
    ]
    identity = uuid4()
    first = run(values, dtype=pl.Decimal(38, 2), bin_count=2, node_id=identity)
    second = run(values[::-1], dtype=pl.Decimal(38, 2), bin_count=2, node_id=identity)
    assert first["dataset"].frame.equals(second["dataset"].frame)
    assert first["dataset"].frame["count"].to_list() == [1, 2]
    assert first["dataset"].frame["upper"][0] == "9007199254740993.12"


def test_nonterminating_edges_and_negative_values_are_not_rounded():
    result = run([-1, 0, 1], bin_count=3)
    assert result["dataset"].frame["upper"].to_list() == ["-1/3", "1/3", "1"]
    assert result["dataset"].frame["count"].to_list() == [1, 1, 1]
    for value in [Fraction(-1, 8), Fraction(2, 5), Fraction(1, 3), Fraction(0), Fraction(123)]:
        assert Fraction(exact_text(value)) == value


def test_float_roundtrip_decimal_spelling_and_extremes():
    result = run([0.1, 0.2, 0.3], dtype=pl.Float64, bin_count=2)
    assert result["dataset"].frame["upper"].to_list() == ["0.2", "0.3"]
    assert result["dataset"].frame["count"].to_list() == [1, 2]
    result = run([-1e308, 0, 1e308], dtype=pl.Float64, bin_count=2)
    assert result["dataset"].frame["count"].to_list() == [1, 2]


@pytest.mark.parametrize("value", [float("inf"), float("-inf"), float("nan")])
def test_nonfinite_input_rejected(value):
    with pytest.raises(ValueConnectionError, match="finite"):
        run([value], dtype=pl.Float64)


@pytest.mark.parametrize(
    "config",
    [
        {"bin_count": 0},
        {"bin_count": 201},
        {"bin_count": True},
        {"bin_count": 1.2},
        {"range_min": "0"},
        {"range_min": "1", "range_max": "1"},
        {"range_min": "2", "range_max": "1"},
        {"range_min": "1e9999", "range_max": "5"},
        {"range_min": "NaN", "range_max": "5"},
    ],
)
def test_invalid_configuration_rejected(config):
    with pytest.raises(ValueError):
        HistogramConfig(value_column_id="v", **config)
