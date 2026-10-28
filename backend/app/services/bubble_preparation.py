"""Full-input validation/scaling with bounded exact transport, no aggregation or sampling."""

import json
from dataclasses import dataclass
from decimal import Context, Decimal, localcontext
from fractions import Fraction
from uuid import UUID, uuid5

import polars as pl

from app.domain.bubble import BubbleAxis, BubblePoint, BubblePresentation, BubbleSpec, BubbleTick
from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.nodes.histogram import exact_text
from app.schemas.dashboards import VisualizationDataset
from app.services.box_plot_visualizations import dataset_page

_NUMERIC = {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}
_CATEGORY = {LogicalType.STRING, LogicalType.INTEGER, LogicalType.BOOLEAN, LogicalType.DATE}
MAX_BUBBLE_PAGE = 2000


@dataclass(frozen=True)
class BubbleFields:
    key: ColumnSchema
    x: ColumnSchema
    y: ColumnSchema
    size: ColumnSchema
    label: ColumnSchema | None
    group: ColumnSchema | None

    def selected(self) -> tuple[ColumnSchema, ...]:
        fields = (self.key, self.x, self.y, self.size, self.label, self.group)
        return tuple({field.column_id: field for field in fields if field is not None}.values())


@dataclass(frozen=True)
class PreparedBubble:
    spec: BubbleSpec
    presentation: BubblePresentation
    observations: VisualizationDataset


def bubble_fields(schema: DatasetSchema, spec: BubbleSpec) -> BubbleFields:
    def resolve(identity: str | None, numeric: bool = False) -> ColumnSchema | None:
        if identity is None:
            return None
        try:
            field = schema.by_id(identity)
        except StopIteration as error:
            raise ValueError("A bubble field is unavailable. Select an existing field.") from error
        if field.logical_type not in (_NUMERIC if numeric else _CATEGORY):
            raise ValueError(
                "Bubble axes and size require numeric fields."
                if numeric
                else "Bubble keys, labels and groups require text, integer, boolean or date fields."
            )
        return field

    key = resolve(spec.key_column_id)
    x, y, size = (
        resolve(identity, True)
        for identity in (spec.x_column_id, spec.y_column_id, spec.size_column_id)
    )
    assert key is not None and x is not None and y is not None and size is not None
    return BubbleFields(
        key, x, y, size, resolve(spec.label_column_id), resolve(spec.group_column_id)
    )


def _fraction(value: object) -> Fraction:
    # String conversion respects the source Float64 semantics without introducing a second cast.
    return Fraction(Decimal(str(value)))


def _axis(series: pl.Series) -> tuple[BubbleAxis, Fraction | None, Fraction | None]:
    minimum, maximum = series.min(), series.max()
    if minimum is None or maximum is None:
        return BubbleAxis(minimum=None, maximum=None, ticks=[], zero_position=None), None, None
    lower, upper = _fraction(minimum), _fraction(maximum)
    span = upper - lower
    ticks = (
        [BubbleTick(position=i / 4, label=exact_text(lower + span * i / 4)) for i in range(5)]
        if span
        else [BubbleTick(position=0.5, label=exact_text(lower))]
    )
    relative = [exact_text(span * i / 4) for i in range(5)] if span else []
    offset = (
        exact_text(lower)
        if relative
        and max(len(tick.label) for tick in ticks) > 12
        and max(map(len, relative)) <= 12
        else None
    )
    for index, tick in enumerate(ticks):
        label = relative[index] if offset is not None else tick.label
        # Axis typography only. Original tick text and all observations remain exact.
        tick.display_label = label if len(label) <= 12 else format(Decimal(label), ".3E")
    return (
        BubbleAxis(
            minimum=exact_text(lower),
            maximum=exact_text(upper),
            ticks=ticks,
            label_offset=offset,
            zero_position=float(-lower / span)
            if span and lower <= 0 <= upper
            else (0.5 if lower == upper == 0 else None),
        ),
        lower,
        span,
    )


def _position(value: object, lower: Fraction | None, span: Fraction | None) -> float | None:
    if value is None or lower is None or span is None:
        return None
    return float((_fraction(value) - lower) / span) if span else 0.5


def _identity(namespace: UUID, field: ColumnSchema, value: object) -> str:
    encoded = json.dumps([field.column_id, field.logical_type.value, value], ensure_ascii=False)
    return str(uuid5(namespace, encoded))


def _radius(value: object, maximum: Fraction | None) -> float | None:
    if value is None:
        return None
    if not maximum:
        return 0.0
    ratio = _fraction(value) / maximum
    # Convert AFTER sqrt: a positive area ratio can underflow Float64 while its radius does not.
    with localcontext(Context(prec=38)):
        return float((Decimal(ratio.numerator) / Decimal(ratio.denominator)).sqrt())


def prepare_bubble(
    dataset: Dataset,
    spec: BubbleSpec,
    namespace: UUID,
    *,
    offset: int = 0,
    limit: int = 1000,
    full_data: bool = False,
) -> PreparedBubble:
    """Return an explicit input-order page; scales/counts/validation always use every input row.

    The caller must label a partial page, not present it as the complete distribution. Null
    numeric roles stay in the table. Zero-area observations have a separate state; a renderer
    must not invent a minimum positive area. Namespace is the publication identity.
    """
    if type(offset) is not int or not 0 <= offset <= 2**63 - 1:
        raise ValueError("Bubble page offset must be a non-negative signed-64-bit integer.")
    if type(limit) is not int or not 1 <= limit <= MAX_BUBBLE_PAGE:
        raise ValueError(f"Bubble page size must be between 1 and {MAX_BUBBLE_PAGE}.")
    fields = bubble_fields(dataset.schema, spec)
    frame = dataset.frame
    key = frame[fields.key.engine_name]
    if key.null_count() or (
        dataset.row_count
        and fields.key.logical_type == LogicalType.STRING
        and key.str.strip_chars().eq("").any()
    ):
        raise ValueError("Bubble observations require a non-empty key in every row.")
    if key.n_unique() != dataset.row_count:
        raise ValueError(
            "Bubble observations require one row per key. Prepare unique rows upstream."
        )
    numeric = (fields.x, fields.y, fields.size)
    for field in numeric:
        series = frame[field.engine_name]
        if series.dtype != pl.Null and not series.dtype.is_numeric():
            raise ValueError("Bubble numeric fields must contain numeric values, not encoded text.")
        if series.dtype.is_float() and not series.drop_nulls().is_finite().all():
            raise ValueError("Bubble numeric values must be finite. Correct the source values.")
    # A declared numeric column can have Null physical storage after an empty transformation.
    # Give only these all-null buffers an arithmetic dtype; no values or source schema are changed.
    null_numeric = {
        field.engine_name for field in numeric if frame[field.engine_name].dtype == pl.Null
    }
    if null_numeric:
        frame = frame.with_columns([pl.col(name).cast(pl.Int64) for name in sorted(null_numeric)])
    size = frame[fields.size.engine_name]
    if size.drop_nulls().lt(0).any():
        raise ValueError("Bubble size cannot be negative. Choose a non-negative measure.")
    missing = pl.any_horizontal([pl.col(field.engine_name).is_null() for field in numeric])
    missing_count, zero_count, visible_count = frame.select(
        missing.sum().alias("missing"),
        ((~missing) & (pl.col(fields.size.engine_name) == 0)).sum().alias("zero"),
        ((~missing) & (pl.col(fields.size.engine_name) > 0)).sum().alias("visible"),
    ).row(0)
    x_axis, x_lower, x_span = _axis(frame[fields.x.engine_name])
    y_axis, y_lower, y_span = _axis(frame[fields.y.engine_name])
    maximum = size.max()
    size_maximum = _fraction(maximum) if maximum is not None else None
    selected = fields.selected()
    page = dataset_page(
        Dataset(frame.select([field.engine_name for field in selected]), DatasetSchema(selected)),
        0 if full_data else offset,
        dataset.row_count if full_data else limit,
    )
    points = []
    for row in page.rows:
        raw_x, raw_y, raw_size = (row[field.engine_name] for field in numeric)
        state = (
            "missing"
            if any(value is None for value in (raw_x, raw_y, raw_size))
            else "zero_size"
            if _fraction(raw_size) == 0
            else "visible"
        )
        points.append(
            BubblePoint(
                id=_identity(namespace, fields.key, row[fields.key.engine_name]),
                key=row[fields.key.engine_name],
                group_id=(
                    _identity(namespace, fields.group, row[fields.group.engine_name])
                    if fields.group is not None
                    else None
                ),
                x=_position(raw_x, x_lower, x_span),
                y=_position(raw_y, y_lower, y_span),
                radius_ratio=_radius(raw_size, size_maximum),
                state=state,
            )
        )
    return PreparedBubble(
        spec=spec,
        observations=page,
        presentation=BubblePresentation(
            x_axis=x_axis,
            y_axis=y_axis,
            size_maximum=exact_text(size_maximum) if size_maximum is not None else None,
            input_count=dataset.row_count,
            missing_count=missing_count,
            zero_size_count=zero_count,
            visible_count=visible_count,
            group_count=frame[fields.group.engine_name].n_unique() if fields.group else 0,
            points=points,
        ),
    )
