from dataclasses import replace
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema
from app.domain.datasets import LogicalType as T
from app.domain.errors import NodeExecutionError
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry
from tests.test_exact_window import CONTEXT

EXECUTOR = get_node_registry().get("pivot", 2).executor


def data(values, index=None, categories=None, scale=2, integer=False):
    count = len(values)
    frame = pl.DataFrame(
        {
            "index": pl.Series(index if index is not None else ["A"] * count, dtype=pl.String),
            "category": pl.Series(
                categories if categories is not None else ["x"] * count, dtype=pl.String
            ),
            "value": pl.Series(
                values if integer else [None if v is None else Decimal(v) for v in values],
                dtype=pl.Int64 if integer else pl.Decimal(38, scale),
            ),
        }
    )
    return Dataset(
        frame,
        DatasetSchema(
            (
                ColumnSchema("i", "index", "Index", T.STRING, True),
                ColumnSchema("p", "category", "Category", T.STRING, True),
                ColumnSchema(
                    "v",
                    "value",
                    "Value",
                    T.INTEGER if integer else T.DECIMAL,
                    True,
                    {} if integer else {"scale": scale, "precision": 38, "currency": "RUB"},
                ),
            )
        ),
    )


def node(operation="sum", **config):
    return NodeInstance(
        uuid4(),
        "pivot",
        2,
        Position(0, 0),
        {
            "index_column_id": "i",
            "pivot_column_id": "p",
            "value_column_id": "v",
            "operation": operation,
            **config,
        },
    )


def run(source, operation="sum", **config):
    return EXECUTOR.execute(node(operation, **config), {"input": source}, CONTEXT)


@pytest.mark.parametrize(
    "operation, expected",
    [("sum", "4.00"), ("average", "2.000000"), ("min", "1.00"), ("max", "3.00"), ("count", 2)],
)
def test_full_groups_null_cells_and_order(operation, expected):
    source = data(
        ["1", None, "3", "0", None],
        index=["A", "A", "A", "B", "C"],
        categories=["x", "x", "x", "y", "x"],
    )
    result = run(source, operation)
    assert result.frame["index"].to_list() == ["A", "B", "C"]
    assert result.frame["pivot_x"].to_list() == [
        Decimal(expected) if isinstance(expected, str) else expected,
        0 if operation == "count" else None,
        0 if operation == "count" else None,
    ]
    assert result.frame["pivot_y"].to_list() == [
        0 if operation == "count" else None,
        1 if operation == "count" else Decimal(0),
        0 if operation == "count" else None,
    ]
    assert result.metadata["exact_transport"]
    if operation == "count":
        assert "currency" not in result.schema.columns[-1].metadata
    else:
        assert result.schema.columns[-1].metadata["currency"] == "RUB"


def test_large_exact_values_half_even_and_decimal_context():
    with localcontext() as ctx:
        ctx.prec = 3
        result = run(data(["9007199254740993.11", "0.02"]))
    assert result.frame["pivot_x"][0] == Decimal("9007199254740993.13")
    result = run(
        data(["1.00", "1.01", "1.01", "1.02"], categories=["x", "x", "y", "y"]),
        "average",
        average_scale=2,
    )
    assert result.frame.row(0) == ("A", Decimal("1.00"), Decimal("1.02"))
    assert run(data([9007199254740993, 2], integer=True)).frame["pivot_x"][0] == Decimal(
        "9007199254740995"
    )


def test_null_categories_label_collisions_and_stable_ids_match_legacy():
    source = data([1, 2, 3], categories=["(empty)", None, "x"], integer=True)
    operation = node()
    result = EXECUTOR.execute(operation, {"input": source}, CONTEXT)
    legacy = (
        get_node_registry()
        .get("pivot", 1)
        .executor.execute(replace(operation, version=1), {"input": source}, CONTEXT)
    )
    assert [(c.column_id, c.engine_name) for c in result.schema.columns] == [
        (c.column_id, c.engine_name) for c in legacy.schema.columns
    ]
    reordered = EXECUTOR.execute(
        operation, {"input": Dataset(source.frame.reverse(), source.schema)}, CONTEXT
    )
    assert {c.column_id for c in result.schema.columns} == {
        c.column_id for c in reordered.schema.columns
    }
    assert result.frame.columns == ["index", "pivot_(empty)", "pivot_(empty)__2", "pivot_x"]


@pytest.mark.parametrize("operation", ["sum", "average", "min", "max", "count"])
def test_empty_schema_and_null_index(operation):
    empty = run(data([]), operation)
    assert empty.frame.shape == (0, 1) and len(empty.schema.columns) == 1
    result = run(data(["1", "2"], index=[None, None]), operation)
    assert result.row_count == 1 and result.frame["index"][0] is None


def test_overflow_and_category_limit_are_explicit():
    with pytest.raises(NodeExecutionError, match="precision"):
        run(data(["9" * 36 + ".99", "0.01"]))
    # No intermediate rounding: an exact cancellation remains representable.
    assert run(data(["9" * 36 + ".99", "0.01", "-0.01"])).frame["pivot_x"][0] == Decimal(
        "9" * 36 + ".99"
    )
    with pytest.raises(NodeExecutionError, match="128"):
        run(data(["1"] * 129, categories=[str(i) for i in range(129)]))


def test_float_rejected_but_count_allowed_and_legacy_unchanged():
    source = data(["1", "2"])
    floats = Dataset(
        source.frame.with_columns(pl.col("value").cast(pl.Float64)),
        DatasetSchema(
            (*source.schema.columns[:-1], replace(source.schema.columns[-1], logical_type=T.FLOAT))
        ),
    )
    assert not EXECUTOR.validate(node(), {"input": floats.schema}, CONTEXT).valid
    assert run(floats, "count").frame["pivot_x"][0] == 2
    old = (
        get_node_registry()
        .get("pivot", 1)
        .executor.execute(replace(node(), version=1), {"input": floats}, CONTEXT)
    )
    assert old.frame["pivot_x"].dtype == pl.Float64


@pytest.mark.parametrize("operation", ["sum", "average", "min", "max", "count"])
def test_independent_full_population_oracle(operation):
    from random import Random

    rng = Random(164)
    amounts = [
        None if i % 7 == 0 else str(Decimal(rng.randrange(-100000, 100000)) / 100)
        for i in range(503)
    ]
    indices = [str(i % 9) for i in range(503)]
    categories = [str(i % 5) for i in range(503)]
    result = run(data(amounts, index=indices, categories=categories), operation, average_scale=8)
    with localcontext() as ctx:
        ctx.prec = 80
        for row in result.frame.iter_rows(named=True):
            for category in set(categories):
                selected = [
                    Decimal(v)
                    for v, key, cat in zip(amounts, indices, categories, strict=True)
                    if v is not None and key == row["index"] and cat == category
                ]
                expected = (
                    len(selected)
                    if operation == "count"
                    else None
                    if not selected
                    else sum(selected)
                    if operation == "sum"
                    else (sum(selected) / len(selected)).quantize(Decimal("0.00000001"))
                    if operation == "average"
                    else min(selected)
                    if operation == "min"
                    else max(selected)
                )
                assert row[f"pivot_{category}"] == expected


def test_nan_keys_are_grouped_by_native_equality_not_python_hashes():
    source = data(["1", "2", "3"])
    source = Dataset(
        source.frame.with_columns(pl.Series("index", [float("nan"), float("nan"), 1.0])),
        DatasetSchema(
            (replace(source.schema.columns[0], logical_type=T.FLOAT), *source.schema.columns[1:])
        ),
    )
    result = run(source)
    assert result.row_count == 2
    assert result.frame["pivot_x"].to_list() == [Decimal(3), Decimal(3)]


def test_full_validation_and_explicit_scale_limits():
    for scale in (-1, 39, 1.5, True):
        assert not EXECUTOR.validate(
            node(average_scale=scale), {"input": data(["1"]).schema}, CONTEXT
        ).valid
    source = data(["1.00000000"] * 130 + ["1.00000001"], scale=8)
    broken = Dataset(
        source.frame,
        DatasetSchema(
            (*source.schema.columns[:-1], replace(source.schema.columns[-1], metadata={"scale": 2}))
        ),
    )
    with pytest.raises(NodeExecutionError, match="scale"):
        run(broken)
    assert run(data(["0." + "0" * 37 + "1"], scale=38)).frame["pivot_x"][0] == Decimal("1e-38")
