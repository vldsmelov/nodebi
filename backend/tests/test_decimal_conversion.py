from uuid import uuid4

import pytest

from app.domain.errors import NodeExecutionError
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry
from tests.test_exact_window import CONTEXT, data


def convert(values, on_error="error", scale=2):
    return (
        get_node_registry()
        .get("convert_types", 1)
        .executor.execute(
            NodeInstance(
                uuid4(),
                "convert_types",
                1,
                Position(0, 0),
                {"conversions": [{"column_id": "a", "target": "integer", "on_error": on_error}]},
            ),
            {"input": data(values, scale=scale)},
            CONTEXT,
        )
    )


@pytest.mark.parametrize("value", ["1.25", "-1.25", "0.01", "-0.01"])
def test_fractional_decimal_to_integer_obeys_error_policy(value):
    with pytest.raises(NodeExecutionError):
        convert([value])
    assert convert([value], "null").frame["amount"].to_list() == [None]


def test_whole_decimals_and_large_integers_remain_exact():
    result = convert(["0.00", "-2.00", "9007199254740993.00", None])
    assert result.frame["amount"].to_list() == [0, -2, 9007199254740993, None]
    assert result.schema.columns[-1].column_id == "a"
    assert result.schema.columns[-1].logical_type == "integer"


def test_precision_tail_and_late_rows_are_not_silently_discarded():
    values = ["1.000000000000000000"] * 130 + ["1.000000000000000001"]
    with pytest.raises(NodeExecutionError):
        convert(values, scale=18)
    assert convert(values, "null", scale=18).frame["amount"].to_list() == [1] * 130 + [None]


def test_integer_overflow_remains_an_error_or_explicit_null():
    with pytest.raises(NodeExecutionError):
        convert(["9223372036854775808.00"])
    assert convert(["9223372036854775808.00"], "null").frame["amount"].to_list() == [None]
