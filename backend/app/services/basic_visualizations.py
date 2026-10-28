"""Project legacy field selections into typed roles after ordinary graph validation."""

from app.domain.basic_visualization_specs import (
    BasicSeries,
    BasicVisualizationSpec,
    CartesianSpec,
    KpiSpec,
    PartToWholeSpec,
    ScatterSpec,
    TableSpec,
)
from app.domain.datasets import DatasetSchema
from app.domain.visualizations import VisualizationConfig


def basic_spec(
    kind: str, config: VisualizationConfig, schema: DatasetSchema, hidden: list[str]
) -> BasicVisualizationSpec:
    if kind == "table":
        return TableSpec(
            columns=[
                column.column_id for column in schema.columns if column.column_id not in hidden
            ]
        )
    assert config.value_column_id is not None
    if kind == "kpi":
        return KpiSpec(value=config.value_column_id)
    assert config.category_column_id is not None
    if kind == "scatter_chart":
        return ScatterSpec(x=config.category_column_id, y=config.value_column_id)
    if kind in {"pie_chart", "donut_chart"}:
        return PartToWholeSpec.model_validate(
            {"type": kind, "category": config.category_column_id, "value": config.value_column_id}
        )
    return CartesianSpec.model_validate(
        {
            "type": kind,
            "x": config.category_column_id,
            "y": [
                BasicSeries(
                    column_id=config.value_column_id,
                    name=config.primary_series_name
                    or schema.by_id(config.value_column_id).display_name,
                ),
                *[
                    BasicSeries(
                        column_id=series.column_id,
                        name=series.name or schema.by_id(series.column_id).display_name,
                    )
                    for series in config.additional_series
                ],
            ],
        }
    )
