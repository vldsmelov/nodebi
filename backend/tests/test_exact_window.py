from dataclasses import replace
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema
from app.domain.datasets import LogicalType as T
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())
EXECUTOR = get_node_registry().get("window", 3).executor


def data(values, groups=None, order=None, scale=2, integer=False):
    count = len(values)
    frame = pl.DataFrame(
        {
            "group": pl.Series(groups if groups is not None else ["A"] * count, dtype=pl.String),
            "order": pl.Series(order if order is not None else list(range(count)), dtype=pl.Int64),
            "amount": pl.Series(
                values if integer else [Decimal(v) if v is not None else None for v in values],
                dtype=pl.Int64 if integer else pl.Decimal(38, scale),
            ),
        }
    )
    return Dataset(
        frame,
        DatasetSchema(
            (
                ColumnSchema("g", "group", "Group", T.STRING, True),
                ColumnSchema("o", "order", "Order", T.INTEGER, True),
                ColumnSchema(
                    "a",
                    "amount",
                    "Amount",
                    T.INTEGER if integer else T.DECIMAL,
                    True,
                    {} if integer else {"precision": 38, "scale": scale, "currency": "RUB"},
                ),
            )
        ),
    )


def node(operation="sum", **overrides):
    return NodeInstance(
        uuid4(),
        "window",
        3,
        Position(0, 0),
        {
            "name": "Result",
            "operation": operation,
            "column_id": "a",
            "partitions": ["g"],
            "order_by": []
            if operation == "sum"
            else [{"column_id": "o", "direction": "ascending"}],
            **overrides,
        },
    )


@pytest.mark.parametrize(
    "operation, expected",
    [
        ("sum", ["2.10", "2.10", "2.10", "2.10"]),
        ("cumulative_sum", ["1.10", None, "3.30", "2.10"]),
        ("cumulative_max", ["1.10", None, "2.20", "2.20"]),
        ("previous", [None, "1.10", None, "2.20"]),
        ("row_number", [1, 2, 3, 4]),
    ],
)
def test_nulls_and_order_have_explicit_semantics(operation, expected):
    source = data(["2.20", "1.10", "-1.20", None], order=[2, 0, 3, 1])
    result = EXECUTOR.execute(node(operation), {"input": source}, CONTEXT)
    assert result.frame["Result"].to_list() == [
        Decimal(v) if isinstance(v, str) else v for v in expected
    ]
    assert result.frame["order"].to_list() == ([2, 0, 3, 1] if operation == "sum" else [0, 1, 2, 3])
    assert result.metadata["exact_transport"]


@pytest.mark.parametrize(
    "operation", ["sum", "cumulative_sum", "cumulative_max", "previous", "row_number"]
)
def test_partitions_empty_all_null_and_original_columns(operation):
    source = data([None, "3.00", None, "5.00"], groups=[None, "A", None, "A"])
    result = EXECUTOR.execute(node(operation), {"input": source}, CONTEXT)
    assert result.schema.columns[:-1] == source.schema.columns
    values = result.frame["Result"].to_list()
    if operation == "row_number":
        assert values == [1, 1, 2, 2]
    else:
        assert values[0] is None and values[2] is None
    empty = EXECUTOR.execute(node(operation), {"input": data([])}, CONTEXT)
    assert empty.row_count == 0
    assert empty.frame["Result"].dtype == (
        pl.Int64 if operation == "row_number" else pl.Decimal(38, 2)
    )


@pytest.mark.parametrize("integer", [False, True])
def test_large_values_are_exact_and_independent_of_decimal_context(integer):
    values = [9007199254740993, 2, -1] if integer else ["9007199254740993.11", "0.02", "-0.01"]
    source = data(values, integer=integer)
    with localcontext() as ctx:
        ctx.prec = 3
        result = EXECUTOR.execute(node("cumulative_sum"), {"input": source}, CONTEXT)
    expected = "9007199254740994" if integer else "9007199254740993.12"
    assert result.frame["Result"][-1] == Decimal(expected)
    assert result.schema.columns[-1].metadata["scale"] == (0 if integer else 2)


@pytest.mark.parametrize("operation", ["sum", "cumulative_sum"])
def test_overflow_is_explicit(operation):
    source = data(["9" * 36 + ".99", "0.01"])
    with pytest.raises(NodeExecutionError, match="precision"):
        EXECUTOR.execute(node(operation), {"input": source}, CONTEXT)


def test_partition_total_allows_cancellation_but_cumulative_output_cannot_overflow():
    source = data(["9" * 36 + ".99", "0.01", "-0.01"])
    assert (
        EXECUTOR.execute(node(), {"input": source}, CONTEXT).frame["Result"][0]
        == source.frame["amount"][0]
    )
    with pytest.raises(NodeExecutionError, match="precision"):
        EXECUTOR.execute(node("cumulative_sum"), {"input": source}, CONTEXT)


@pytest.mark.parametrize(
    "operation", ["cumulative_sum", "cumulative_max", "previous", "row_number"]
)
def test_tied_order_is_rejected_within_but_not_across_partitions(operation):
    with pytest.raises(NodeExecutionError, match="ties"):
        EXECUTOR.execute(node(operation), {"input": data(["1", "2"], order=[1, 1])}, CONTEXT)
    EXECUTOR.execute(
        node(operation), {"input": data(["1", "2"], order=[1, 1], groups=["A", "B"])}, CONTEXT
    )


def test_descending_null_last_and_no_partition():
    result = EXECUTOR.execute(
        node("previous", partitions=[], order_by=[{"column_id": "o", "direction": "descending"}]),
        {"input": data(["1", "2", "3"], order=[None, 1, 2])},
        CONTEXT,
    )
    assert result.frame["order"].to_list() == [2, 1, None]
    assert result.frame["Result"].to_list() == [None, Decimal(3), Decimal(2)]


def test_float_rejected_and_legacy_versions_unchanged():
    source = data(["0.1", "0.2"])
    with pytest.raises(ValueError, match="numeric"):
        get_node_registry().get("window", 2).executor.execute(
            replace(node(), version=2), {"input": source}, CONTEXT
        )
    floats = Dataset(
        source.frame.with_columns(pl.col("amount").cast(pl.Float64)),
        DatasetSchema(
            (*source.schema.columns[:-1], replace(source.schema.columns[-1], logical_type=T.FLOAT))
        ),
    )
    with pytest.raises(ValueError, match="Float64"):
        EXECUTOR.execute(node(), {"input": floats}, CONTEXT)
    for version in (1, 2):
        result = (
            get_node_registry()
            .get("window", version)
            .executor.execute(replace(node(), version=version), {"input": floats}, CONTEXT)
        )
        assert result.frame["Result"].dtype == pl.Float64


@pytest.mark.parametrize(
    "overrides",
    [
        {"name": " "},
        {"name": "amount"},
        {"column_id": None},
        {"partitions": ["g", "g"]},
        {"operation": "previous", "order_by": []},
        {"order_by": [{"column_id": "o"}, {"column_id": "o"}]},
    ],
)
def test_invalid_configuration(overrides):
    with pytest.raises(ValueError):
        EXECUTOR.infer_schema(node(**overrides), {"input": data(["1"]).schema}, CONTEXT)


@pytest.mark.parametrize("operation", ["sum", "cumulative_sum", "cumulative_max", "previous"])
def test_full_population_matches_independent_decimal_oracle(operation):
    from random import Random

    rng = Random(161)
    with localcontext() as ctx:
        ctx.prec = 80
        values = [
            None if i % 7 == 0 else str(Decimal(rng.randrange(-10000, 10000)) / 100)
            for i in range(307)
        ]
        source = data(values, groups=[str(i % 9) for i in range(len(values))])
        expected = [None] * len(values)
        for group in range(9):
            indices = list(range(group, len(values), 9))
            total, previous = None, None
            for index in indices:
                current = Decimal(values[index]) if values[index] is not None else None
                if operation == "previous":
                    expected[index] = previous
                elif current is not None:
                    total = (
                        max(total, current)
                        if operation == "cumulative_max" and total is not None
                        else current
                        if total is None
                        else total + current
                    )
                    expected[index] = total
                previous = current
            if operation == "sum":
                for index in indices:
                    expected[index] = total
    assert (
        EXECUTOR.execute(node(operation), {"input": source}, CONTEXT).frame["Result"].to_list()
        == expected
    )


def test_scale_38_and_metadata_survive_without_rounding():
    source = data(["0." + "0" * 37 + "1"] * 3, scale=38)
    result = EXECUTOR.execute(node("cumulative_sum"), {"input": source}, CONTEXT)
    assert result.frame["Result"][-1] == Decimal("3e-38")
    assert result.schema.columns[-1].metadata == {
        "scale": 38,
        "precision": 38,
        "currency": "RUB",
        "source_columns": ["a"],
    }


def test_invalid_physical_values_and_scale_do_not_get_silently_coerced():
    source = data(["1.01"])
    bad_scale = Dataset(
        source.frame,
        DatasetSchema(
            (*source.schema.columns[:-1], replace(source.schema.columns[-1], metadata={"scale": 0}))
        ),
    )
    with pytest.raises(NodeExecutionError, match="decimal scale"):
        EXECUTOR.execute(node(), {"input": bad_scale}, CONTEXT)
    bad_type = Dataset(source.frame.with_columns(pl.col("amount").cast(pl.Float64)), source.schema)
    with pytest.raises(NodeExecutionError, match="numeric schema"):
        EXECUTOR.execute(node(), {"input": bad_type}, CONTEXT)


def test_window_row_limit_is_explicit_before_materializing(monkeypatch):
    source = data(["1"])
    monkeypatch.setattr(Dataset, "row_count", property(lambda self: 250001))
    with pytest.raises(NodeExecutionError, match="250000-row"):
        EXECUTOR.execute(node(), {"input": source}, CONTEXT)
