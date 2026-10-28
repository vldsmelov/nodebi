from dataclasses import replace
from decimal import Decimal
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry
from app.nodes.combine import union_datasets, union_schema
from tests.test_exact_window import CONTEXT, data


def join(left, right, version=1, how="inner", relationship="many_to_many"):
    config = (
        {"left_key": "a", "right_key": "a", "how": how}
        if version == 1
        else {
            "keys": [{"left_key": "a", "right_key": "a"}],
            "how": how,
            "relationship": relationship,
        }
    )
    node = NodeInstance(uuid4(), "join", version, Position(0, 0), config)
    executor = get_node_registry().get("join", version).executor
    result = executor.execute(node, {"left": left, "right": right}, CONTEXT)
    assert result.schema == executor.infer_schema(
        node, {"left": left.schema, "right": right.schema}, CONTEXT
    )
    return result


def metadata(source, **values):
    return Dataset(
        source.frame,
        DatasetSchema(
            (*source.schema.columns[:-1], replace(source.schema.columns[-1], metadata=values))
        ),
        source.metadata,
    )


@pytest.mark.parametrize("scale", [0, 2, 8, 18, 38])
def test_union_preserves_all_decimal_digits_and_scale_metadata(scale):
    text = "1" if not scale else "0." + "0" * (scale - 1) + "1"
    left, right = data([text, None], scale=scale), data([text], scale=scale)
    result = union_datasets(left, right)
    assert result.frame["amount"].to_list() == [Decimal(text), None, Decimal(text)]
    assert result.frame["amount"].dtype == pl.Decimal(38, scale)
    assert result.schema == union_schema(left.schema, right.schema)
    assert result.schema.columns[-1].metadata["scale"] == scale
    assert result.schema.columns[-1].metadata["currency"] == "RUB"
    assert result.metadata["exact_transport"]


@pytest.mark.parametrize("version", [1, 2])
def test_distinct_high_precision_join_keys_never_false_match(version):
    left = data(["1.00000001", "1.00000002", None], scale=8)
    right = data(["1.00000002", None], scale=8)
    result = join(left, right, version, "left", "one_to_one")
    assert result.frame["amount"].to_list() == [Decimal("1.00000001"), Decimal("1.00000002"), None]
    assert result.frame["amount__right"].to_list() == [None, Decimal("1.00000002"), None]
    diagnostic = result.metadata["join_diagnostics"]
    assert diagnostic["matched_left_rows"] == 1
    assert diagnostic["unmatched_left_rows"] == 2
    assert diagnostic["left_duplicate_keys"] == 0
    assert diagnostic["right_duplicate_keys"] == 0
    assert result.metadata["exact_transport"]
    assert result.schema.by_name("amount__right").metadata["scale"] == 8


def test_mixed_scales_widen_and_equal_keys_still_match():
    left, right = data(["1.1"], scale=1), data(["1.10000000"], scale=8)
    result = join(left, right, 2, relationship="one_to_one")
    assert result.row_count == 1
    for field in ["amount", "amount__right"]:
        assert result.frame[field].dtype == pl.Decimal(38, 8)
        assert result.schema.by_name(field).metadata["scale"] == 8
    appended = union_datasets(left, right)
    assert appended.frame["amount"].to_list() == [Decimal("1.10000000")] * 2


@pytest.mark.parametrize("operation", [union_datasets, join])
def test_unknown_null_fields_adopt_known_decimal_schema(operation):
    right = data(["1.00000001"], scale=8)
    left = data([None])
    left = Dataset(
        left.frame.with_columns(pl.col("amount").cast(pl.Null)),
        DatasetSchema(
            (
                *left.schema.columns[:-1],
                replace(left.schema.columns[-1], logical_type=LogicalType.UNKNOWN, metadata={}),
            )
        ),
    )
    result = operation(left, right)
    assert result.schema.by_name("amount").metadata["scale"] == 8
    assert result.frame["amount"].dtype == pl.Decimal(38, 8)


@pytest.mark.parametrize("operation", [union_datasets, join])
def test_conflicting_units_or_overflow_are_explicit(operation):
    left = data(["1.00"])
    with pytest.raises(ValueError, match="currencies"):
        operation(left, metadata(left, scale=2, currency="USD"))
    with pytest.raises(ValueError, match="currencies"):
        operation(metadata(left, scale=2, unit="kg"), metadata(left, scale=2, unit="m"))
    with pytest.raises(NodeExecutionError, match="precision"):
        operation(data(["9" * 36 + ".99"]), data(["0.00000001"], scale=8))


def test_unknown_currency_is_not_advertised_and_empty_union_schema_survives():
    left = data([], scale=8)
    result = union_datasets(left, metadata(left, scale=8))
    assert result.row_count == 0
    assert "currency" not in result.schema.columns[-1].metadata
    assert result.schema.columns[-1].metadata["scale"] == 8


@pytest.mark.parametrize("operation", [union_datasets, join])
def test_missing_scale_and_physical_mismatch_fail(operation):
    source = data(["1.00000001"], scale=8)
    with pytest.raises(ValueError, match="scales"):
        operation(metadata(source), source)
    with pytest.raises(NodeExecutionError, match="declared scale"):
        operation(metadata(source, scale=2), source)


def test_composed_values_remain_exact_in_downstream_formulas():
    source = union_datasets(data(["1.00000001"], scale=8), data(["2.00"]))
    node = NodeInstance(
        uuid4(),
        "calculated_column",
        2,
        Position(0, 0),
        {
            "name": "Exact",
            "expression": "[a] * 2",
            "scale": 8,
        },
    )
    result = (
        get_node_registry()
        .get("calculated_column", 2)
        .executor.execute(node, {"input": source}, CONTEXT)
    )
    assert result.frame["Exact"].to_list() == [Decimal("2.00000002"), Decimal("4.00000000")]


def test_true_duplicate_decimal_keys_still_fail_declared_relationship():
    with pytest.raises(NodeExecutionError, match="Right join keys are not unique"):
        join(
            data(["1.00000001"], scale=8),
            data(["1.00000001", "1.00000001"], scale=8),
            2,
            relationship="one_to_one",
        )


def test_non_key_decimal_fields_keep_independent_units_and_scales():
    left = data(["1.00000001"], scale=8)
    right = metadata(data(["1.25"]), scale=2, currency="USD")
    node = NodeInstance(uuid4(), "join", 1, Position(0, 0), {"left_key": "g", "right_key": "g"})
    executor = get_node_registry().get("join", 1).executor
    result = executor.execute(node, {"left": left, "right": right}, CONTEXT)
    assert result.schema.by_name("amount").metadata["scale"] == 8
    assert result.schema.by_name("amount__right").metadata["scale"] == 2
    assert result.schema.by_name("amount__right").metadata["currency"] == "USD"
    assert result.frame["amount"].to_list() == [Decimal("1.00000001")]
    assert result.frame["amount__right"].to_list() == [Decimal("1.25")]


@pytest.mark.parametrize("operation", [union_datasets, join])
def test_integer_only_composition_preserves_exact_transport(operation):
    original = data(["1.00"])
    source = Dataset(
        original.frame.with_columns(pl.lit(9007199254740993).alias("amount")),
        DatasetSchema(
            (
                *original.schema.columns[:-1],
                replace(original.schema.columns[-1], logical_type=LogicalType.INTEGER),
            )
        ),
        {"exact_transport": True, "join_diagnostics": {"obsolete": True}},
    )
    result = operation(source, source)
    assert result.metadata["exact_transport"]
    assert result.frame["amount"][0] == 9007199254740993
    assert result.metadata.get("join_diagnostics", {}).get("obsolete") is None
