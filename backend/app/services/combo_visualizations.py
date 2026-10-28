"""Combination charts present prepared measures without hidden grouping or alignment."""

import json
import uuid
from decimal import Decimal
from fractions import Fraction

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualization_specs import ComboSpec
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.nodes.histogram import exact_text
from app.schemas.dashboards import (
    ComboObservation,
    ComboPresentation,
    ComboScale,
    ComboTick,
    VisualizationResult,
)
from app.services.box_plot_visualizations import dataset_page
from app.services.execution import ExecutionResult
from app.services.normalization import transport_rows


def validate_combo(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "combo_chart":
        return
    if not isinstance(config.spec, ComboSpec) or output.kind != "dataset":
        raise ValueError("Configure combination category and bar/line series on a prepared table.")
    validate_combo_config(config)


def validate_combo_config(config: VisualizationConfig) -> None:
    if not isinstance(config.spec, ComboSpec):
        raise ValueError("Configure combination category and bar/line series on a prepared table.")
    if config.additional_series or config.grain_column_ids is not None:
        raise ValueError("Combination charts use typed series, not additional measure series.")
    if config.orientation != "vertical":
        raise ValueError("Combination charts use a horizontal category axis.")


def combo_fields(schema: DatasetSchema, spec: ComboSpec) -> tuple[ColumnSchema, list[ColumnSchema]]:
    try:
        category = schema.by_id(spec.category_column_id)
        measures = [schema.by_id(item.column_id) for item in spec.series]
    except StopIteration as exc:
        raise ValueError("A selected combination field is unavailable.") from exc
    if category.logical_type not in {
        LogicalType.STRING,
        LogicalType.INTEGER,
        LogicalType.DATE,
        LogicalType.BOOLEAN,
    }:
        raise ValueError("Combination categories require a text, integer, boolean or date field.")
    if any(
        field.logical_type not in {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}
        for field in measures
    ):
        raise ValueError("Combination series require numeric fields.")
    for axis in ("primary", "secondary"):
        units = {
            (field.metadata.get("unit") or "", field.metadata.get("currency") or "")
            for item, field in zip(spec.series, measures, strict=True)
            if item.axis == axis
        }
        if len(units) > 1:
            raise ValueError(
                "Combination series on one axis must have matching unit and currency metadata."
            )
    return category, measures


def combo_presentation(
    dataset: Dataset, spec: ComboSpec, namespace: uuid.UUID
) -> ComboPresentation:
    category, measures = combo_fields(dataset.schema, spec)
    keys = dataset.frame[category.engine_name]
    if keys.null_count() or (
        category.logical_type == LogicalType.STRING and keys.str.strip_chars().eq("").any()
    ):
        raise ValueError("Combination categories need non-empty identifiers.")
    if keys.n_unique() != dataset.row_count:
        raise ValueError(
            "Combination charts need one row per category. Aggregate or align upstream."
        )
    if dataset.row_count > 2000:
        raise ValueError(
            "Combination charts support up to 2000 categories. Filter or group upstream."
        )
    # Only selected columns leave Polars; do not serialize an entire wide publication.
    rows = transport_rows(
        dataset.frame.select([category.engine_name, *(f.engine_name for f in measures)])
    )
    values = [
        [
            None if row[field.engine_name] is None else Decimal(str(row[field.engine_name]))
            for field in measures
        ]
        for row in rows
    ]
    if any(value is not None and not value.is_finite() for row in values for value in row):
        raise ValueError("Combination values must be finite numbers or empty.")
    scales: dict[str, ComboScale] = {}
    spans: dict[str, Fraction] = {}
    for axis in ("primary", "secondary"):
        indexes = [index for index, item in enumerate(spec.series) if item.axis == axis]
        if not indexes:
            continue
        numbers = [
            Fraction(0),
            *(Fraction(value) for row in values for i in indexes if (value := row[i]) is not None),
        ]
        lower, upper = min(numbers), max(numbers)
        span = upper - lower
        spans[axis] = span or Fraction(1)
        # Zero stays the drawing origin for bars, including negative values. Never clip baselines.
        scales[axis] = ComboScale(
            minimum=exact_text(lower),
            maximum=exact_text(upper),
            lower=float(lower / span) if span else -1,
            upper=float(upper / span) if span else 1,
            ticks=[
                ComboTick(
                    position=float(lower / span + Fraction(i, 4)),
                    label=exact_text(lower + span * i / 4),
                )
                for i in range(5)
            ]
            if span
            else [ComboTick(position=0, label="0")],
        )
    return ComboPresentation(
        primary=scales["primary"],
        secondary=scales.get("secondary"),
        observations=[
            ComboObservation(
                id=str(
                    uuid.uuid5(
                        namespace,
                        json.dumps(
                            [
                                category.column_id,
                                category.logical_type.value,
                                row[category.engine_name],
                            ],
                            ensure_ascii=False,
                        ),
                    )
                ),
                positions=[
                    None if value is None else float(Fraction(value) / spans[item.axis])
                    for value, item in zip(values[index], spec.series, strict=True)
                ],
            )
            for index, row in enumerate(rows)
        ],
    )


def render_combo(
    visualization: Visualization,
    workflow: Workflow,
    config: VisualizationConfig,
    result: ExecutionResult,
    context: ExecutionContext,
    applied: list[str],
    unsupported: list[str],
) -> VisualizationResult:
    assert isinstance(config.spec, ComboSpec)
    dataset = result.output
    presentation = combo_presentation(
        dataset, config.spec, visualization.publication_id or visualization.id
    )
    ids = list(
        dict.fromkeys(
            [
                config.spec.category_column_id,
                *(item.column_id for item in config.spec.series),
                *config.context_column_ids,
                *([config.highlight_column_id] if config.highlight_column_id else []),
            ]
        )
    )
    fields = [dataset.schema.by_id(identity) for identity in ids]
    dataset = Dataset(
        dataset.frame.select([field.engine_name for field in fields]),
        DatasetSchema(tuple(fields)),
        dataset.metadata,
    )
    page = dataset_page(dataset, 0, dataset.row_count)
    return VisualizationResult(
        spec=config.spec,
        combo=presentation,
        datasets={"observations": page},
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="combo_chart",
        applied_context=applied,
        unsupported_filters=unsupported,
        context_column_ids=config.context_column_ids,
        highlight_field=dataset.schema.by_id(config.highlight_column_id).engine_name
        if config.highlight_column_id
        else None,
        highlight_value=context.parameters.get(config.highlight_parameter)
        if config.highlight_parameter
        else None,
        title=TITLE_PARAMETER.sub(
            lambda match: (
                str(context.parameters[match[1]])
                if context.parameters.get(match[1]) is not None
                else "—"
            ),
            config.title,
        )
        if config.title_template
        else config.title,
        category_field=dataset.schema.by_id(config.spec.category_column_id).engine_name,
        value_field=None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        **page.model_dump(),
    )
