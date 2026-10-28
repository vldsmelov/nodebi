from dataclasses import replace
from datetime import date
from decimal import Decimal, Inexact, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.bubble import BubbleSpec
from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, polars_to_logical
from app.services.bubble_preparation import prepare_bubble


def data(rows, dtype=pl.Float64):
    frame = pl.DataFrame(
        rows,
        schema={"key": pl.String, "x": dtype, "y": dtype, "size": dtype, "group": pl.String},
        orient="row",
    )
    return from_frame(frame)


def from_frame(frame):
    return Dataset(
        frame,
        DatasetSchema(
            tuple(
                ColumnSchema(name, name, name.upper(), polars_to_logical(dtype), True)
                for name, dtype in frame.schema.items()
            )
        ),
    )


def spec(**patch):
    return BubbleSpec.model_validate(
        {
            "key_column_id": "key",
            "x_column_id": "x",
            "y_column_id": "y",
            "size_column_id": "size",
            "group_column_id": "group",
            **patch,
        }
    )


def test_full_scales_area_ratio_missing_zero_and_exact_page():
    result = prepare_bubble(
        data(
            [
                ("001", -10, 20, 1, "A"),
                ("002", 10, 40, 4, "A"),
                ("003", 0, 30, 0, None),
                ("004", None, 0, 16, ""),
                ("005", 100, 100, None, "B"),
            ]
        ),
        spec(),
        uuid4(),
        limit=3,
    )
    presentation = result.presentation
    assert (presentation.input_count, presentation.missing_count) == (5, 2)
    assert (presentation.visible_count, presentation.zero_size_count) == (2, 1)
    assert presentation.size_maximum == "16"  # Includes incomplete rows, not just displayed points.
    assert presentation.group_count == 4  # Null and empty category remain distinct.
    assert (presentation.x_axis.minimum, presentation.x_axis.maximum) == ("-10", "100")
    assert presentation.x_axis.zero_position == pytest.approx(1 / 11)
    assert [tick.label for tick in presentation.x_axis.ticks] == [
        "-10",
        "17.5",
        "45",
        "72.5",
        "100",
    ]
    assert [point.radius_ratio for point in presentation.points] == [0.25, 0.5, 0]
    assert [point.state for point in presentation.points] == ["visible", "visible", "zero_size"]
    assert result.observations.truncated and result.observations.total_rows == 5
    assert result.observations.rows[0]["key"] == "001"
    assert presentation.points[0].group_id == presentation.points[1].group_id


def test_page_invariance_identity_reordering_and_renaming():
    namespace = uuid4()
    dataset = data([("A", 1, 2, 3, None), ("B", 4, None, 6, ""), ("C", 7, 8, None, "G")])
    first = prepare_bubble(dataset, spec(), namespace, limit=2)
    second = prepare_bubble(dataset, spec(), namespace, offset=2, limit=2)
    reverse = prepare_bubble(replace(dataset, frame=dataset.frame.reverse()), spec(), namespace)
    assert (
        first.presentation.points + second.presentation.points == reverse.presentation.points[::-1]
    )
    assert first.presentation.x_axis == second.presentation.x_axis
    assert first.presentation.size_maximum == second.presentation.size_maximum
    assert first.presentation.points[1].state == second.presentation.points[0].state == "missing"
    assert first.presentation.points[1].y is None
    assert second.presentation.points[0].radius_ratio is None
    assert first.presentation.points[0].group_id != first.presentation.points[1].group_id
    renamed = Dataset(
        dataset.frame.rename({"key": "new_key", "x": "new_x"}),
        DatasetSchema(
            tuple(
                replace(
                    c,
                    engine_name={"key": "new_key", "x": "new_x"}.get(c.engine_name, c.engine_name),
                    display_name="renamed",
                )
                for c in dataset.schema.columns
            )
        ),
    )
    assert prepare_bubble(
        renamed, spec(), namespace
    ).presentation == reverse.presentation.model_copy(
        update={"points": reverse.presentation.points[::-1]}
    )
    changed = prepare_bubble(dataset, spec(), uuid4())
    assert changed.presentation.points[0].id != first.presentation.points[0].id


def test_precision_and_transport_do_not_depend_on_decimal_context():
    dataset = data(
        [
            ("A", Decimal("9007199254740993.01"), Decimal("-0.01"), Decimal("0.01"), None),
            ("B", Decimal("9007199254740993.02"), Decimal("0.01"), Decimal("0.04"), None),
        ],
        dtype=pl.Decimal(38, 2),
    )
    with localcontext() as context:
        context.prec = 2
        result = prepare_bubble(dataset, spec(), uuid4())
    assert [point.x for point in result.presentation.points] == [0, 1]
    assert result.presentation.x_axis.ticks[1].label == "9007199254740993.0125"
    assert result.presentation.x_axis.label_offset == "9007199254740993.01"
    assert result.presentation.x_axis.ticks[1].display_label == "0.0025"
    assert [point.radius_ratio for point in result.presentation.points] == [0.5, 1]
    assert result.observations.rows[0]["x"] == "9007199254740993.01"
    assert result.presentation.y_axis.zero_position == 0.5


def test_radius_approximation_is_isolated_from_callers_decimal_traps():
    with localcontext() as context:
        context.traps[Inexact] = True
        result = prepare_bubble(data([("A", 0, 0, 1, None), ("B", 1, 1, 3, None)]), spec(), uuid4())
    assert result.presentation.points[0].radius_ratio == pytest.approx((1 / 3) ** 0.5)


def test_float_extremes_do_not_overflow_or_turn_positive_size_into_zero():
    result = prepare_bubble(
        data(
            [
                ("A", -1e308, 0, 5e-324, None),
                ("B", 1e308, 0, 1e308, None),
            ]
        ),
        spec(),
        uuid4(),
    )
    assert [point.x for point in result.presentation.points] == [0, 1]
    assert result.presentation.x_axis.label_offset is None
    assert result.presentation.x_axis.ticks[0].display_label == "-1.000E+308"
    assert 0 < result.presentation.points[0].radius_ratio < 1e-300
    assert [point.state for point in result.presentation.points] == ["visible", "visible"]
    assert result.presentation.y_axis.zero_position == 0.5
    assert [point.y for point in result.presentation.points] == [0.5, 0.5]


@pytest.mark.parametrize("rows", [[], [("A", None, None, None, None)]])
def test_empty_and_all_null(rows):
    result = prepare_bubble(data(rows), spec(), uuid4())
    assert result.presentation.x_axis.minimum is None
    assert result.presentation.x_axis.ticks == []
    assert result.presentation.size_maximum is None
    assert result.presentation.visible_count == 0
    assert result.presentation.missing_count == len(rows)


def test_declared_numeric_null_storage_and_invalid_encoded_storage():
    original = data([("A", None, None, None, None)])
    null_frame = original.frame.with_columns(pl.col("x", "y", "size").cast(pl.Null))
    result = prepare_bubble(replace(original, frame=null_frame), spec(), uuid4())
    assert result.presentation.missing_count == 1
    assert result.presentation.size_maximum is None
    empty_frame = original.frame.head(0).with_columns(pl.all().cast(pl.Null))
    empty = prepare_bubble(replace(original, frame=empty_frame), spec(), uuid4())
    assert empty.presentation.input_count == 0
    assert empty.presentation.points == []
    encoded = original.frame.with_columns(pl.lit("1.23").alias("x"))
    with pytest.raises(ValueError, match="encoded text"):
        prepare_bubble(replace(original, frame=encoded), spec(), uuid4())


def test_constant_nonzero_axes_zero_only_size_and_empty_page():
    dataset = data([("A", 5, -3, 0, None)])
    result = prepare_bubble(dataset, spec(), uuid4())
    assert [(tick.position, tick.label) for tick in result.presentation.x_axis.ticks] == [
        (0.5, "5")
    ]
    assert result.presentation.x_axis.zero_position is None
    assert result.presentation.points[0].radius_ratio == 0
    beyond = prepare_bubble(dataset, spec(), uuid4(), offset=2**63 - 1)
    assert beyond.observations.rows == beyond.presentation.points == []
    assert beyond.presentation.zero_size_count == 1


@pytest.mark.parametrize("key", [None, "", "  ", "\t\n"])
def test_invalid_keys_outside_page(key):
    with pytest.raises(ValueError, match="non-empty key"):
        prepare_bubble(data([("A", 1, 1, 1, None), (key, 1, 1, 1, None)]), spec(), uuid4(), limit=1)


def test_duplicate_keys_outside_page():
    with pytest.raises(ValueError, match="one row per key"):
        prepare_bubble(data([("A", 1, 1, 1, None)] * 2), spec(), uuid4(), limit=1)


@pytest.mark.parametrize("role", ["x", "y", "size"])
@pytest.mark.parametrize("value", [float("inf"), float("-inf"), float("nan")])
def test_nonfinite_anywhere(role, value):
    row = {"key": "B", "x": 1, "y": 1, "size": 1, "group": None, role: value}
    with pytest.raises(ValueError, match="finite"):
        prepare_bubble(data([("A", 1, 1, 1, None), tuple(row.values())]), spec(), uuid4(), limit=1)


def test_negative_size_is_not_hidden_by_missing_coordinates_or_paging():
    with pytest.raises(ValueError, match="cannot be negative"):
        prepare_bubble(
            data([("A", 1, 1, 1, None), ("B", None, None, -1, None)]), spec(), uuid4(), limit=1
        )


@pytest.mark.parametrize(
    "patch",
    [
        {"size_encoding": "radius"},
        {"version": 2},
        {"key_column_id": ""},
        {"group_column_id": ""},
        {"x_column_id": ""},
        {"aggregation": "sum"},
    ],
)
def test_strict_spec(patch):
    with pytest.raises(ValueError):
        spec(**patch)


@pytest.mark.parametrize(
    "patch,message",
    [
        ({"x_column_id": "key"}, "numeric fields"),
        ({"key_column_id": "x"}, "text, integer"),
        ({"group_column_id": "x"}, "text, integer"),
        ({"label_column_id": "absent"}, "unavailable"),
    ],
)
def test_schema_roles(patch, message):
    with pytest.raises(ValueError, match=message):
        prepare_bubble(data([]), spec(**patch), uuid4())


@pytest.mark.parametrize(
    "patch",
    [
        {"offset": -1},
        {"offset": 2**63},
        {"offset": True},
        {"offset": 0.5},
        {"limit": 0},
        {"limit": 2001},
        {"limit": True},
        {"limit": 1.5},
    ],
)
def test_page_guards(patch):
    with pytest.raises(ValueError, match="Bubble page"):
        prepare_bubble(data([]), spec(), uuid4(), **patch)


@pytest.mark.parametrize(
    "keys",
    [[False, True], [date(2026, 1, 1), date(2026, 1, 2)], [9007199254740993, 9007199254740994]],
)
def test_typed_keys_exact_transport_and_shared_roles(keys):
    dataset = from_frame(pl.DataFrame({"key": keys, "value": [1, 4]}))
    result = prepare_bubble(
        dataset,
        spec(
            x_column_id="value",
            y_column_id="value",
            size_column_id="value",
            group_column_id="key",
            label_column_id="key",
        ),
        uuid4(),
    )
    assert len(result.observations.columns) == 2
    assert len({point.id for point in result.presentation.points}) == 2
    assert result.presentation.group_count == 2
    assert [point.key for point in result.presentation.points] == [
        row["key"] for row in result.observations.rows
    ]
    if isinstance(keys[0], int) and not isinstance(keys[0], bool):
        assert result.presentation.points[0].key == "9007199254740993"


def test_wide_hundred_thousand_rows_keeps_transport_bounded_and_checks_tail():
    frame = pl.DataFrame(
        {
            "key": [str(i) for i in range(100000)],
            "value": range(100000),
            **{f"unused_{i}": [i] * 100000 for i in range(20)},
        }
    )
    settings = spec(
        x_column_id="value", y_column_id="value", size_column_id="value", group_column_id=None
    )
    result = prepare_bubble(from_frame(frame), settings, uuid4(), offset=99999)
    assert result.presentation.x_axis.maximum == result.presentation.size_maximum == "99999"
    assert result.presentation.visible_count == 99999
    assert result.presentation.zero_size_count == 1
    assert len(result.observations.rows) == 1 and len(result.observations.columns) == 2
    duplicate = pl.concat([frame, frame.head(1)])
    with pytest.raises(ValueError, match="one row per key"):
        prepare_bubble(from_frame(duplicate), settings, uuid4(), limit=1)
