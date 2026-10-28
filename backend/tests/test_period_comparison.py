from dataclasses import replace
from datetime import date
from decimal import Decimal
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def dataset(dates, amounts, groups=None, exact=True):
    frame = pl.DataFrame(
        {
            "date": pl.Series(dates, dtype=pl.Date),
            "group": groups or ["A"] * len(dates),
            "amount": pl.Series(amounts, dtype=pl.Decimal(38, 2) if exact else pl.Float64),
        }
    )
    schema = DatasetSchema(
        (
            ColumnSchema("date", "date", "Date", LogicalType.DATE, False),
            ColumnSchema("group", "group", "Group", LogicalType.STRING, True),
            ColumnSchema(
                "amount",
                "amount",
                "Amount",
                LogicalType.DECIMAL if exact else LogicalType.FLOAT,
                True,
                {"precision": 38, "scale": 2} if exact else {},
            ),
        )
    )
    return Dataset(frame, schema)


def run(source, kind="period_comparison", **config):
    settings = {"date_column_id": "date", "unit": "month"}
    if kind == "period_comparison":
        settings.update(value_column_id="amount", partitions=["group"], name="Change")
    node = NodeInstance(uuid4(), kind, 1, Position(0, 0), {**settings, **config})
    executor = get_node_registry().get(kind, 1).executor
    result = executor.execute(node, {"input": source}, CONTEXT)
    assert result.schema == executor.infer_schema(node, {"input": source.schema}, CONTEXT)
    return result


def test_exact_calendar_lookup_skips_no_missing_period_and_preserves_input_order():
    data = dataset(
        [date(2026, 2, 1), date(2026, 1, 1), date(2026, 4, 1)],
        [Decimal("9007199254740993.12"), Decimal("9007199254740993.11"), Decimal("5")],
    )
    result = run(data)
    assert result.frame["Change · previous"].to_list() == [
        Decimal("9007199254740993.11"),
        None,
        None,
    ]
    assert result.frame["Change · difference"].to_list() == [Decimal("0.01"), None, None]
    assert result.frame["Change · baseline exists"].to_list() == [True, False, False]
    assert result.frame["date"].to_list() == data.frame["date"].to_list()


@pytest.mark.parametrize(
    "baseline,current,expected",
    [
        ("100", "125", "25.000000"),
        ("-100", "-50", "-50.000000"),
        ("0", "5", None),
        (None, "5", None),
    ],
)
def test_percentage_denominator_and_missing_are_explicit(baseline, current, expected):
    result = run(
        dataset(
            [date(2026, 1, 1), date(2026, 2, 1)],
            [Decimal(baseline) if baseline is not None else None, Decimal(current)],
        )
    )
    assert result.frame["Change · change %"][1] == (Decimal(expected) if expected else None)
    assert result.frame["Change · baseline exists"][1] is True


def test_partition_keys_including_nulls_do_not_cross_contaminate():
    result = run(
        dataset(
            [date(2026, 1, 1), date(2026, 1, 1), date(2026, 2, 1), date(2026, 2, 1)],
            [Decimal("10"), Decimal("20"), Decimal("12"), Decimal("24")],
            [None, "B", None, "B"],
        )
    )
    assert result.frame["Change · previous"].to_list() == [None, None, Decimal("10"), Decimal("20")]


@pytest.mark.parametrize(
    "unit,compare_to,earlier,later",
    [
        ("month", "previous_period", date(2025, 12, 1), date(2026, 1, 1)),
        ("quarter", "previous_period", date(2025, 10, 1), date(2026, 1, 1)),
        ("quarter", "previous_year", date(2025, 4, 1), date(2026, 4, 1)),
        ("year", "previous_period", date(2025, 1, 1), date(2026, 1, 1)),
    ],
)
def test_calendar_boundaries(unit, compare_to, earlier, later):
    result = run(
        dataset([earlier, later], [1.0, 2.0], exact=False), unit=unit, compare_to=compare_to
    )
    assert result.frame["Change · difference"][1] == 1.0
    assert result.frame["Change · change %"][1] == 100.0


@pytest.mark.parametrize(
    "unit,expected",
    [("month", date(2024, 2, 1)), ("quarter", date(2024, 1, 1)), ("year", date(2024, 1, 1))],
)
def test_calendar_bucket_handles_leap_day(unit, expected):
    result = run(dataset([date(2024, 2, 29)], [Decimal("1")]), "calendar_period", unit=unit)
    assert result.frame["date"][0] == expected


@pytest.mark.parametrize(
    "dates,message",
    [
        ([None], "non-empty"),
        ([date(2026, 1, 15)], "period starts"),
        ([date(2026, 1, 1)] * 51, "one row per period"),
    ],
)
def test_invalid_dates_and_duplicates_beyond_preview_fail(dates, message):
    with pytest.raises(ValueError, match=message):
        run(dataset(dates, [Decimal("1")] * len(dates)))


def test_empty_comparison_and_bucket_keep_explicit_schema():
    for kind in ("calendar_period", "period_comparison"):
        assert run(dataset([], []), kind).row_count == 0


def test_integer_values_above_javascript_precision_remain_exact():
    original = dataset([date(2026, 1, 1), date(2026, 2, 1)], [Decimal("1"), Decimal("2")])
    schema = DatasetSchema(
        (
            *original.schema.columns[:2],
            replace(original.schema.columns[2], logical_type=LogicalType.INTEGER, metadata={}),
        )
    )
    source = Dataset(
        original.frame.with_columns(
            pl.Series("amount", [9007199254740993, 9007199254740994], dtype=pl.Int64)
        ),
        schema,
    )
    result = run(source)
    assert result.frame["Change · previous"][1] == 9007199254740993
    assert result.frame["Change · difference"][1] == Decimal("1")


def test_missing_decimal_scale_is_not_silently_rounded_to_integer():
    original = dataset([date(2026, 1, 1)], [Decimal("1.23")])
    schema = DatasetSchema(
        (*original.schema.columns[:2], replace(original.schema.columns[2], metadata={}))
    )
    with pytest.raises(ValueError, match="explicit scale"):
        run(Dataset(original.frame, schema))


@pytest.mark.parametrize("value", [float("inf"), float("nan")])
def test_nonfinite_values_are_not_rendered(value):
    with pytest.raises(ValueError, match="finite numbers"):
        run(dataset([date(2026, 1, 1)], [value], exact=False))


def test_decimal_difference_overflow_fails_instead_of_wrapping():
    source = dataset(
        [date(2026, 1, 1), date(2026, 2, 1)],
        [Decimal("9" * 36 + ".99"), Decimal("-" + "9" * 36 + ".99")],
    )
    with pytest.raises(ValueError, match="precision"):
        run(source)
