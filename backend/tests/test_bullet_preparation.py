from dataclasses import replace
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.bullet import BulletSpec
from app.domain.datasets import DatasetSchema
from app.services.bullet_preparation import prepare_bullet
from tests.test_bubble_preparation import from_frame


def data(rows, dtype=pl.Int64):
    return from_frame(
        pl.DataFrame(
            rows, schema={"key": pl.String, "actual": dtype, "target": dtype}, orient="row"
        )
    )


def spec(**patch):
    return BulletSpec.model_validate(
        dict(
            category_column_id="key",
            actual_column_id="actual",
            target_column_id="target",
            minimum="-100",
            maximum="100",
            bands=[
                {"label": "Below", "upper": "0", "tone": "negative"},
                {"label": "Middle", "upper": "50", "tone": "warning"},
                {"label": "Upper", "upper": "100", "tone": "positive"},
            ],
        )
        | patch
    )


def test_exact_intervals_boundaries_missing_zero_and_shared_page_scale():
    source = data(
        [("A", -100, 100), ("B", 0, None), ("C", 50, -50), ("D", 100, 0), ("E", None, 80)]
    )
    identity = uuid4()
    prepared = prepare_bullet(source, spec(), identity, limit=2)
    assert prepared.observations.truncated and len(prepared.observations.rows) == 2
    result = prepared.presentation
    assert (result.input_count, result.missing_actual_count, result.missing_target_count) == (
        5,
        1,
        1,
    )
    assert result.zero == 0.5 and result.band_ends == [0.5, 0.75, 1]
    assert [(p.actual, p.target, p.actual_band, p.actual_zero) for p in result.points] == [
        (0, 1, 0, False),
        (0.5, None, 1, True),
    ]
    complete = prepare_bullet(source, spec(), identity, full_data=True).presentation
    assert [p.actual_band for p in complete.points] == [0, 1, 2, 2, None]
    assert [t.label for t in result.ticks] == ["-100", "-50", "0", "50", "100"]
    tail = prepare_bullet(source, spec(), identity, offset=3, limit=2)
    assert tail.presentation.points == complete.points[3:]
    assert tail.presentation.ticks == result.ticks
    reversed_data = replace(source, frame=source.frame.reverse())
    assert prepare_bullet(reversed_data, spec(), identity).presentation.points == list(
        reversed(complete.points)
    )


def test_decimal_boundaries_above_javascript_safe_integer_and_low_decimal_context():
    value = Decimal("9007199254740993.11")
    source = data(
        [("A", value, value), ("B", Decimal("9007199254740993.12"), value)], pl.Decimal(38, 2)
    )
    settings = spec(
        minimum="0",
        maximum="9007199254740993.13",
        bands=[
            {"label": "Before", "upper": "9007199254740993.12"},
            {"label": "Boundary", "upper": "9007199254740993.13"},
        ],
    )
    with localcontext() as context:
        context.prec = 2
        result = prepare_bullet(source, settings, uuid4())
    assert result.observations.rows[0]["actual"] == "9007199254740993.11"
    assert [point.actual_band for point in result.presentation.points] == [0, 1]
    # Exact comparison must reject an amount only 0.01 beyond the specified maximum.
    settings = spec(
        minimum="0", maximum=str(value), bands=[{"label": "Before", "upper": str(value)}]
    )
    with pytest.raises(ValueError, match="exceed"):
        prepare_bullet(source, settings, uuid4())


@pytest.mark.parametrize("rows", [[], [("A", None, None)]])
def test_empty_and_physical_null_numeric_buffers(rows):
    source = data(rows)
    source = replace(
        source,
        frame=source.frame.with_columns(
            pl.col("actual").cast(pl.Null), pl.col("target").cast(pl.Null)
        ),
    )
    result = prepare_bullet(source, spec(), uuid4())
    assert result.presentation.input_count == len(rows)
    assert all(
        p.actual is None and p.target is None and not p.actual_zero
        for p in result.presentation.points
    )


@pytest.mark.parametrize(
    "patch",
    [
        {"minimum": "NaN"},
        {"maximum": "1e4"},
        {"minimum": "10"},
        {"minimum": "100"},
        {"category_column_id": "actual"},
        {"bands": []},
        {"bands": [{"label": "", "upper": "100"}]},
        {"bands": [{"label": "Low", "upper": "101"}]},
        {"bands": [{"label": "Same", "upper": "0"}, {"label": "Same", "upper": "100"}]},
        {
            "bands": [
                {"label": "A", "upper": "50"},
                {"label": "B", "upper": "40"},
                {"label": "C", "upper": "100"},
            ]
        },
    ],
)
def test_invalid_explicit_scale_is_rejected(patch):
    with pytest.raises(ValueError):
        spec(**patch)


@pytest.mark.parametrize(
    "rows,message",
    [
        ([("A", 101, 0)], "exceed"),
        ([("A", 0, -101)], "exceed"),
        ([("A", 0, 0), ("A", 1, 1)], "one row"),
        ([(" ", 0, 0)], "non-empty"),
        ([(None, 0, 0)], "non-empty"),
    ],
)
def test_invalid_population(rows, message):
    with pytest.raises(ValueError, match=message):
        prepare_bullet(data(rows), spec(), uuid4())


@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf")])
def test_nonfinite_values_fail(value):
    with pytest.raises(ValueError, match="finite"):
        prepare_bullet(data([("A", value, 0)], pl.Float64), spec(), uuid4())


def test_full_input_guards_and_units_are_not_based_on_visible_page():
    rows = [(str(i), 0, 0) for i in range(5000)]
    with pytest.raises(ValueError, match="exceed"):
        prepare_bullet(data([*rows, ("Tail", 101, 0)]), spec(), uuid4(), limit=1)
    source = data([("A", 0, 0)])
    source = replace(
        source,
        schema=DatasetSchema(
            tuple(
                replace(c, metadata={"currency": "RUB"}) if c.column_id == "actual" else c
                for c in source.schema.columns
            )
        ),
    )
    with pytest.raises(ValueError, match="units and currency"):
        prepare_bullet(source, spec(), uuid4())


@pytest.mark.parametrize(
    "patch", [{"offset": -1}, {"offset": 2**63}, {"offset": True}, {"limit": 0}, {"limit": 2001}]
)
def test_invalid_page(patch):
    with pytest.raises(ValueError, match="pages require"):
        prepare_bullet(data([]), spec(), uuid4(), **patch)
