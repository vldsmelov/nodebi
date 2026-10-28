from datetime import date
from decimal import Decimal

import polars as pl
import pytest

from app.domain.values import ValueConnectionError
from app.nodes.waterfall import WaterfallConfig
from tests.test_waterfall import run


def test_explicit_order_preserves_exact_balance_and_legacy_default():
    rows = [
        (3, Decimal("-2.30"), "change"),
        (1, Decimal("10.10"), "initial"),
        (2, Decimal("0.20"), "change"),
        (4, None, "total"),
    ]
    with pytest.raises(ValueConnectionError, match="first row"):
        run(rows, dtype=pl.Decimal(38, 2), label_type=pl.Int64)
    output = run(rows, dtype=pl.Decimal(38, 2), label_type=pl.Int64, order_column_id="label")
    assert output.frame["category"].to_list() == ["1", "2", "3", "4"]
    assert output.frame["balance"].to_list() == [
        Decimal("10.10"),
        Decimal("10.30"),
        Decimal("8.00"),
        Decimal("8.00"),
    ]
    assert output.metadata["statistics"]["order"] == "ascending"
    assert (
        "order_column_id"
        not in WaterfallConfig(category_column_id="label", value_column_id="value").model_dump()
    )


@pytest.mark.parametrize(
    "rows", [[("A", 1, "change"), ("B", 1, "change")], [("A", 1, "change"), ("B", None, "total")]]
)
def test_ambiguous_order_is_rejected(rows):
    with pytest.raises(ValueConnectionError, match="unique and non-empty"):
        run(rows, order_column_id="value")


def test_text_order_is_rejected_during_schema_inference():
    with pytest.raises(ValueConnectionError, match="integer, decimal, date or datetime"):
        run([("A", 1, "change")], order_column_id="kind")


def test_ordered_dates_and_large_decimal_keys_do_not_lose_identity():
    dated = run(
        [(date(2026, 2, 1), 3, "change"), (date(2026, 1, 1), 2, "change")],
        label_type=pl.Date,
        order_column_id="label",
    )
    assert dated.frame["category"].to_list() == ["2026-01-01", "2026-02-01"]
    assert dated.frame["balance"].to_list() == [Decimal(2), Decimal(5)]
    precise = run(
        [
            ("Later", Decimal("9007199254740993.13"), "change"),
            ("Earlier", Decimal("9007199254740993.12"), "change"),
        ],
        dtype=pl.Decimal(38, 2),
        order_column_id="value",
    )
    assert precise.frame["category"].to_list() == ["Earlier", "Later"]
    assert precise.frame["balance"].to_list()[-1] == Decimal("18014398509481986.25")
