from dataclasses import replace
from decimal import Decimal
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry
from tests.test_exact_window import CONTEXT, data

NODE_ID = uuid4()


def run(source, fields=None):
    return (
        get_node_registry()
        .get("unpivot", 1)
        .executor.execute(
            NodeInstance(NODE_ID, "unpivot", 1, Position(0, 0), {"columns": fields or ["a"]}),
            {"input": source},
            CONTEXT,
        )
    )


@pytest.mark.parametrize("scale", [0, 2, 8, 18, 38])
def test_decimal_unpivot_keeps_every_digit_metadata_and_null(scale):
    value = "1" if scale == 0 else "0." + "0" * (scale - 1) + "1"
    source = data([value, None], scale=scale)
    result = run(source)
    assert result.frame["value"].to_list() == [Decimal(value), None]
    assert result.frame["value"].dtype == pl.Decimal(38, scale)
    assert result.schema.columns[-1].metadata == {
        "source_columns": ["a"],
        "precision": 38,
        "scale": scale,
        "currency": "RUB",
    }
    empty = run(Dataset(source.frame.head(0), source.schema))
    assert empty.row_count == 0 and empty.schema == result.schema


def combined(first="1.11", second="0.00000001"):
    source = data([first])
    other = ColumnSchema(
        "b",
        "second",
        "Second",
        LogicalType.DECIMAL,
        True,
        {"precision": 38, "scale": 8, "currency": "RUB"},
    )
    return Dataset(
        source.frame.with_columns(pl.Series("second", [Decimal(second)], dtype=pl.Decimal(38, 8))),
        DatasetSchema((*source.schema.columns, other)),
    )


def test_mixed_scales_are_widened_without_rounding_and_use_common_metadata():
    result = run(combined(), ["a", "b"])
    assert result.frame["value"].to_list() == [Decimal("1.11000000"), Decimal("0.00000001")]
    assert result.schema.columns[-1].metadata["scale"] == 8
    assert result.schema.columns[-1].metadata["currency"] == "RUB"


def test_incompatible_currency_and_precision_fail_instead_of_corrupting_values():
    source = combined()
    mismatch = Dataset(
        source.frame,
        DatasetSchema(
            (
                *source.schema.columns[:-1],
                replace(source.schema.columns[-1], metadata={"scale": 8, "currency": "USD"}),
            )
        ),
    )
    with pytest.raises(ValueError, match="currencies"):
        run(mismatch, ["a", "b"])
    with pytest.raises(NodeExecutionError, match="precision"):
        run(combined("9" * 36 + ".99"), ["a", "b"])


def test_missing_or_inaccurate_scale_is_not_guessed():
    source = data(["1.00000001"], scale=8)
    for metadata in ({}, {"scale": 6}):
        broken = Dataset(
            source.frame,
            DatasetSchema(
                (*source.schema.columns[:-1], replace(source.schema.columns[-1], metadata=metadata))
            ),
        )
        with pytest.raises((ValueError, NodeExecutionError), match="scale"):
            run(broken)


def test_reshaped_decimal_remains_exact_in_downstream_formula():
    source = run(data(["1.00000001"], scale=8))
    formula = NodeInstance(
        uuid4(),
        "calculated_column",
        2,
        Position(0, 0),
        {
            "name": "Exact",
            "expression": f"[{source.schema.columns[-1].column_id}] * 2",
            "scale": 8,
        },
    )
    result = (
        get_node_registry()
        .get("calculated_column", 2)
        .executor.execute(formula, {"input": source}, CONTEXT)
    )
    assert result.frame["Exact"][0] == Decimal("2.00000002")
    assert result.metadata["exact_transport"]
