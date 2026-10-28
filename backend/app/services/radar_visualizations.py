"""Radar compares already prepared rows. Aggregation belongs to the ordinary graph."""

import json
import uuid
from decimal import Decimal
from fractions import Fraction

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualization_specs import RadarSpec
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.schemas.dashboards import RadarPresentation, RadarProfileResult, VisualizationResult
from app.services.box_plot_visualizations import dataset_page
from app.services.execution import ExecutionResult
from app.services.normalization import transport_rows


def validate_radar(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "radar_chart":
        return
    if not isinstance(config.spec, RadarSpec) or output.kind != "dataset":
        raise ValueError("Configure radar profile, axes and explicit scales on a prepared table.")
    validate_radar_config(config)


def validate_radar_config(config: VisualizationConfig) -> None:
    if not isinstance(config.spec, RadarSpec):
        raise ValueError("Configure radar profile, axes and explicit scales on a prepared table.")
    if config.additional_series or config.grain_column_ids is not None:
        raise ValueError(
            "Radar uses profile rows and axis bindings, not additional measure series."
        )


def radar_fields(schema: DatasetSchema, spec: RadarSpec) -> tuple[ColumnSchema, list[ColumnSchema]]:
    try:
        profile = schema.by_id(spec.profile_column_id)
        axes = [schema.by_id(axis.column_id) for axis in spec.axes]
    except StopIteration as exc:
        raise ValueError("A selected radar field is unavailable.") from exc
    if profile.logical_type not in {
        LogicalType.STRING,
        LogicalType.INTEGER,
        LogicalType.DATE,
        LogicalType.BOOLEAN,
    }:
        raise ValueError("Radar profiles require a text, integer, boolean or date field.")
    if any(
        axis.logical_type not in {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}
        for axis in axes
    ):
        raise ValueError("Radar axes require numeric fields.")
    units = {
        (axis.metadata.get("unit") or "", axis.metadata.get("currency") or "") for axis in axes
    }
    if spec.normalization == "shared" and len(units) != 1:
        raise ValueError("Different radar units require explicit min-max normalization.")
    return profile, axes


def radar_presentation(
    dataset: Dataset, spec: RadarSpec, namespace: uuid.UUID
) -> RadarPresentation:
    profile, axes = radar_fields(dataset.schema, spec)
    keys = dataset.frame[profile.engine_name]
    if keys.null_count() or (
        profile.logical_type == LogicalType.STRING and keys.str.strip_chars().eq("").any()
    ):
        raise ValueError("Radar profiles need non-empty identifiers.")
    if keys.n_unique() != dataset.row_count:
        raise ValueError("Radar needs one row per profile. Aggregate or align the data upstream.")
    if dataset.row_count > 20:
        raise ValueError("Radar supports up to 20 profiles. Filter the prepared table upstream.")
    profiles = []
    for row in transport_rows(dataset.frame):
        positions: list[float | None] = []
        for axis, column in zip(spec.axes, axes, strict=True):
            raw = row[column.engine_name]
            if raw is None:
                positions.append(None)
                continue
            value = Decimal(str(raw))
            if not value.is_finite():
                raise ValueError("Radar values must be finite numbers or empty.")
            lower, upper = Decimal(axis.minimum), Decimal(axis.maximum)
            if not lower <= value <= upper:
                raise ValueError(
                    "A radar value is outside its configured scale. Adjust the axis bounds."
                )
            positions.append(
                float((Fraction(value) - Fraction(lower)) / (Fraction(upper) - Fraction(lower)))
            )
        category = row[profile.engine_name]
        identity = str(
            uuid.uuid5(
                namespace,
                json.dumps(
                    [profile.column_id, profile.logical_type.value, category], ensure_ascii=False
                ),
            )
        )
        profiles.append(
            RadarProfileResult(
                id=identity,
                category=category,
                positions=positions,
                complete=all(position is not None for position in positions),
            )
        )
    return RadarPresentation(
        profiles=profiles, incomplete_count=sum(not item.complete for item in profiles)
    )


def render_radar(
    visualization: Visualization,
    workflow: Workflow,
    config: VisualizationConfig,
    result: ExecutionResult,
    context: ExecutionContext,
    applied: list[str],
    unsupported: list[str],
) -> VisualizationResult:
    assert isinstance(config.spec, RadarSpec)
    dataset = result.output
    radar = radar_presentation(
        dataset, config.spec, visualization.publication_id or visualization.id
    )
    # Keep only referenced fields; wide prepared tables must not inflate the visualization payload.
    ids = list(
        dict.fromkeys(
            [
                config.spec.profile_column_id,
                *(axis.column_id for axis in config.spec.axes),
                *config.context_column_ids,
                *([config.highlight_column_id] if config.highlight_column_id else []),
            ]
        )
    )
    fields = [dataset.schema.by_id(key) for key in ids]
    dataset = Dataset(
        dataset.frame.select([column.engine_name for column in fields]),
        DatasetSchema(tuple(fields)),
        dataset.metadata,
    )
    page = dataset_page(dataset, 0, dataset.row_count)
    return VisualizationResult(
        spec=config.spec,
        datasets={"profiles": page},
        radar=radar,
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="radar_chart",
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
        category_field=dataset.schema.by_id(config.spec.profile_column_id).engine_name,
        value_field=None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        orientation=config.orientation,
        **page.model_dump(),
    )
