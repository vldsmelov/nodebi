from decimal import Decimal
from uuid import uuid4

import pytest

from app.domain.errors import NodeExecutionError
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry
from tests.test_exact_window import CONTEXT, EXECUTOR, data, node


@pytest.mark.parametrize("fallback", ["nullif(0, 0)", "0"])
def test_exact_share_then_selection_preserves_denominator_and_null_policy(fallback):
    source = data(["1", "3", None, "1", "-1", None], groups=["A", "A", "A", "B", "B", "C"])
    total = node()
    prepared = EXECUTOR.execute(total, {"input": source}, CONTEXT)
    formula = NodeInstance(
        uuid4(),
        "calculated_column",
        2,
        Position(0, 0),
        {
            "name": "Share",
            "expression": f"safe_divide([a], [window_{total.id.hex}], {fallback})",
            "precision": 38,
            "scale": 6,
            "rounding": "half_even",
        },
    )
    shares = (
        get_node_registry()
        .get("calculated_column", 2)
        .executor.execute(formula, {"input": prepared}, CONTEXT)
    )
    empty = None if fallback == "nullif(0, 0)" else Decimal(0)
    assert shares.frame["Share"].to_list() == [
        Decimal("0.25"),
        Decimal("0.75"),
        None,
        empty,
        empty,
        empty,
    ]
    selection = NodeInstance(
        uuid4(),
        "filter",
        1,
        Position(0, 0),
        {
            "mode": "and",
            "conditions": [{"column_id": "o", "operator": "equals", "value": 0}],
        },
    )
    selected = (
        get_node_registry().get("filter", 1).executor.execute(selection, {"input": shares}, CONTEXT)
    )
    assert selected.frame["Share"].to_list() == [Decimal("0.25")]
    assert selected.frame["Result"].to_list() == [Decimal(4)]


def test_large_exact_shares_and_selected_output_scale():
    source = data(["9007199254740993.11", "9007199254740993.13"])
    total = node()
    prepared = EXECUTOR.execute(total, {"input": source}, CONTEXT)
    formula = NodeInstance(
        uuid4(),
        "calculated_column",
        2,
        Position(0, 0),
        {
            "name": "Share",
            "expression": f"safe_divide([a], [window_{total.id.hex}], None)",
            "precision": 38,
            "scale": 20,
        },
    )
    result = (
        get_node_registry()
        .get("calculated_column", 2)
        .executor.execute(formula, {"input": prepared}, CONTEXT)
    )
    assert result.frame["Share"].to_list() == [
        Decimal("0.49999999999999999944"),
        Decimal("0.50000000000000000056"),
    ]
    assert result.schema.columns[-1].metadata["scale"] == 20


def test_exact_row_rank_orders_close_values_and_rejects_residual_ties():
    source = data(["9007199254740993.11", "9007199254740993.13", "9007199254740993.11"])
    rank = node(
        "row_number", order_by=[{"column_id": "a", "direction": "descending"}, {"column_id": "o"}]
    )
    result = EXECUTOR.execute(rank, {"input": source}, CONTEXT)
    assert result.frame["order"].to_list() == [1, 0, 2]
    assert result.frame["Result"].to_list() == [1, 2, 3]
    with pytest.raises(NodeExecutionError, match="ties"):
        EXECUTOR.execute(rank, {"input": data(["1", "1"], order=[0, 0])}, CONTEXT)
