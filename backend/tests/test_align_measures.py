from dataclasses import replace
from decimal import Decimal
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())
DECIMAL = pl.Decimal(38, 2)


def data(keys, values, key_type=pl.String, value_type=DECIMAL):
    from app.domain.datasets import polars_to_logical

    return Dataset(
        pl.DataFrame(
            {"key": pl.Series(keys, dtype=key_type), "value": pl.Series(values, dtype=value_type)}
        ),
        DatasetSchema(
            (
                ColumnSchema("key", "key", "Key", polars_to_logical(key_type), True),
                ColumnSchema(
                    "value",
                    "value",
                    "Value",
                    polars_to_logical(value_type),
                    True,
                    {"precision": 38, "scale": 2, "currency": "RUB"}
                    if value_type == pl.Decimal(38, 2)
                    else {},
                ),
            )
        ),
    )


def execute(left, right, **patch):
    node = NodeInstance(
        uuid4(),
        "align_measures",
        1,
        Position(0, 0),
        {
            "keys": [{"left_key": "key", "right_key": "key"}],
            "left_value": "value",
            "right_value": "value",
            **patch,
        },
    )
    executor = get_node_registry().get(node.type, 1).executor
    result = executor.execute(node, {"left": left, "right": right}, CONTEXT)
    assert result.schema == executor.infer_schema(
        node, {"left": left.schema, "right": right.schema}, CONTEXT
    )
    return result


def test_full_alignment_preserves_exact_values_and_unmatched_keys():
    result = execute(
        data(["001", "003"], [Decimal("9007199254740993.11"), None]),
        data(["002", "001"], [Decimal("0.00"), Decimal("9007199254740993.12")]),
    )
    assert result.frame.rows() == [
        ("001", Decimal("9007199254740993.11"), Decimal("9007199254740993.12"), True, True),
        ("003", None, None, True, False),
        ("002", None, Decimal("0.00"), False, True),
    ]
    assert result.schema.columns[1].metadata["currency"] == "RUB"
    assert result.metadata["alignment_diagnostics"] | {"node_id": None} == {
        "node_id": None,
        "matched_rows": 1,
        "left_only_rows": 1,
        "right_only_rows": 1,
        "result_rows": 3,
    }


@pytest.mark.parametrize("left_keys,right_keys", [([], []), (["a"], []), ([], ["b"])])
def test_empty_inputs_keep_schema_and_presence(left_keys, right_keys):
    result = execute(
        data(left_keys, [None] * len(left_keys)), data(right_keys, [None] * len(right_keys))
    )
    assert result.row_count == len(left_keys) + len(right_keys)
    assert result.frame["left_present"].to_list() == [bool(left_keys)] * result.row_count
    assert result.frame["right_present"].to_list() == [bool(right_keys)] * result.row_count


def test_null_key_policy_is_explicit_and_null_measure_is_not_missing_row():
    left = data([None], [None])
    with pytest.raises(NodeExecutionError, match="empty values"):
        execute(left, left)
    result = execute(left, left, null_keys="match")
    assert result.frame.rows() == [(None, None, None, True, True)]


@pytest.mark.parametrize("side", ["left", "right"])
@pytest.mark.parametrize("key", [None, "0"])
def test_duplicates_beyond_preview_are_rejected_even_for_empty_keys(side, key):
    keys = [str(i) for i in range(101)] + [key, key]
    repeated = data(keys, [Decimal("1")] * len(keys))
    other = data(["x"], [Decimal("2")])
    with pytest.raises(NodeExecutionError, match=f"{side.title()} alignment keys are not unique"):
        execute(
            repeated if side == "left" else other,
            repeated if side == "right" else other,
            null_keys="match",
        )


@pytest.mark.parametrize("value", [float("inf"), float("nan")])
def test_nonfinite_measure_is_rejected(value):
    with pytest.raises(NodeExecutionError, match="finite"):
        execute(data(["a"], [value], value_type=pl.Float64), data(["a"], [None]))


@pytest.mark.parametrize("kind", ["logical", "physical", "float_key", "non_numeric"])
def test_incompatible_fields_require_explicit_preparation(kind):
    left = data([1], [Decimal("1")], key_type=pl.Int64)
    if kind == "logical":
        right = data(["1"], [Decimal("1")])
    elif kind == "physical":
        right = data([1], [Decimal("1")], key_type=pl.Int32)
    elif kind == "float_key":
        left = right = data([1.0], [Decimal("1")], key_type=pl.Float64)
    else:
        right = data([1], ["text"], key_type=pl.Int64, value_type=pl.String)
    with pytest.raises((ValueError, NodeExecutionError)):
        execute(left, right)


def test_composite_keys_match_as_tuples_and_keep_identity_across_column_reorder():
    def composite(keys, regions):
        base = data(keys, [Decimal("1")] * len(keys))
        return Dataset(
            base.frame.with_columns(pl.Series("region", regions)),
            DatasetSchema(
                (
                    *base.schema.columns,
                    replace(
                        base.schema.columns[0],
                        column_id="region",
                        engine_name="region",
                        display_name="Region",
                    ),
                )
            ),
        )

    left = composite(["A", "A"], ["East", "West"])
    right = composite(["A", "B"], ["West", "East"])
    # Incoming column order and display names do not determine field identity.
    right = Dataset(
        right.frame.select("region", "value", "key"),
        DatasetSchema(
            tuple(
                replace(c, display_name="Renamed " + c.display_name)
                for c in reversed(right.schema.columns)
            )
        ),
    )
    result = execute(
        left,
        right,
        keys=[
            {"left_key": "key", "right_key": "key"},
            {"left_key": "region", "right_key": "region"},
        ],
    )
    assert result.frame.rows() == [
        ("A", "East", Decimal("1"), None, True, False),
        ("A", "West", Decimal("1"), Decimal("1"), True, True),
        ("B", "East", None, Decimal("1"), False, True),
    ]


@pytest.mark.parametrize(
    "patch",
    [
        {"left_value": "key"},
        {"left_name": "Same", "right_name": "Same"},
        {"keys": [{"left_key": "key", "right_key": "key"}] * 2},
    ],
)
def test_ambiguous_config_is_rejected(patch):
    source = data(["a"], [None])
    with pytest.raises(ValueError):
        execute(source, source, **patch)


def test_result_size_limit_is_checked_before_full_join(monkeypatch):
    import app.nodes.align_measures as alignment

    seen = []

    def limit(rows, columns):
        seen.append((rows, columns))
        if rows > 2:
            raise NodeExecutionError("Test result size limit")

    monkeypatch.setattr(alignment, "check_size", limit)
    with pytest.raises(NodeExecutionError, match="size limit"):
        execute(data(["a", "b"], [None, None]), data(["c", "d"], [None, None]))
    assert seen == [(2, 5), (2, 5), (4, 5)]
