"""Full-input bullet validation and exact bounded transport; no hidden aggregation."""

import json
from dataclasses import dataclass
from decimal import Context, Decimal, localcontext
from fractions import Fraction
from uuid import UUID, uuid5

import polars as pl

from app.domain.bubble import BubbleTick
from app.domain.bullet import BulletPoint, BulletPresentation, BulletSpec
from app.domain.datasets import Dataset, DatasetSchema, LogicalType
from app.nodes.histogram import exact_text
from app.schemas.dashboards import VisualizationDataset
from app.services.box_plot_visualizations import dataset_page


@dataclass(frozen=True)
class PreparedBullet:
    presentation: BulletPresentation
    observations: VisualizationDataset


def prepare_bullet(
    dataset: Dataset,
    spec: BulletSpec,
    namespace: UUID,
    *,
    offset: int = 0,
    limit: int = 100,
    full_data: bool = False,
) -> PreparedBullet:
    if (
        type(offset) is not int
        or not 0 <= offset <= 2**63 - 1
        or type(limit) is not int
        or not 1 <= limit <= 2000
    ):
        raise ValueError("Bullet pages require a non-negative offset and 1 to 2000 rows.")
    try:
        category, actual, target = (
            dataset.schema.by_id(identity)
            for identity in (spec.category_column_id, spec.actual_column_id, spec.target_column_id)
        )
    except StopIteration as error:
        raise ValueError("A bullet field is unavailable. Select an existing field.") from error
    if category.logical_type not in {
        LogicalType.STRING,
        LogicalType.INTEGER,
        LogicalType.DATE,
        LogicalType.BOOLEAN,
    }:
        raise ValueError("Bullet categories require text, integer, boolean or date fields.")
    if any(
        field.logical_type not in {LogicalType.INTEGER, LogicalType.FLOAT, LogicalType.DECIMAL}
        for field in (actual, target)
    ):
        raise ValueError("Bullet actual and target fields must be numeric.")
    if any(
        (actual.metadata.get(key) or "") != (target.metadata.get(key) or "")
        for key in ("unit", "currency")
    ):
        raise ValueError("Bullet actual and target must have matching units and currency.")
    keys = dataset.frame[category.engine_name]
    if keys.null_count() or (
        dataset.row_count
        and category.logical_type == LogicalType.STRING
        and keys.str.strip_chars().eq("").any()
    ):
        raise ValueError("Bullet categories must be non-empty.")
    if keys.n_unique() != dataset.row_count:
        raise ValueError("Bullet charts need one row per category. Aggregate or align upstream.")
    lower, upper = Fraction(spec.minimum), Fraction(spec.maximum)
    span = upper - lower
    for field in (actual, target):
        series = dataset.frame[field.engine_name]
        if series.dtype == pl.Null:
            continue
        if not series.dtype.is_numeric():
            raise ValueError("Bullet values must contain numbers, not encoded text.")
        if series.dtype.is_float() and not series.drop_nulls().is_finite().all():
            raise ValueError("Bullet actual and target must be finite or empty.")
        minimum, maximum = series.min(), series.max()
        if minimum is not None and (
            Fraction(str(minimum)) < lower or Fraction(str(maximum)) > upper
        ):
            raise ValueError(
                "Bullet values exceed the explicit scale. Adjust its bounds and ranges."
            )
    fields = tuple({field.column_id: field for field in (category, actual, target)}.values())
    page = dataset_page(
        Dataset(dataset.frame.select([f.engine_name for f in fields]), DatasetSchema(fields)),
        0 if full_data else offset,
        dataset.row_count if full_data else limit,
    )
    bounds = [Fraction(band.upper) for band in spec.bands]
    points = []
    for row in page.rows:
        a = Fraction(str(row[actual.engine_name])) if row[actual.engine_name] is not None else None
        t = Fraction(str(row[target.engine_name])) if row[target.engine_name] is not None else None
        identity = json.dumps(
            [category.column_id, category.logical_type.value, row[category.engine_name]],
            ensure_ascii=False,
        )
        points.append(
            BulletPoint(
                id=str(uuid5(namespace, identity)),
                actual=float((a - lower) / span) if a is not None else None,
                target=float((t - lower) / span) if t is not None else None,
                actual_band=next(
                    (i for i, bound in enumerate(bounds) if a < bound or i == len(bounds) - 1), None
                )
                if a is not None
                else None,
                actual_zero=a == 0,
            )
        )
    ticks = []
    for i in range(5):
        label = exact_text(lower + span * i / 4)
        with localcontext(Context(prec=38)):
            display = label if len(label) <= 12 else format(Decimal(label), ".3E")
        ticks.append(BubbleTick(position=i / 4, label=label, display_label=display))
    return PreparedBullet(
        BulletPresentation(
            zero=float(-lower / span),
            ticks=ticks,
            band_ends=[float((bound - lower) / span) for bound in bounds],
            input_count=dataset.row_count,
            missing_actual_count=dataset.frame[actual.engine_name].null_count(),
            missing_target_count=dataset.frame[target.engine_name].null_count(),
            points=points,
        ),
        page,
    )
