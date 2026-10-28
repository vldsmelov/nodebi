"""Typed transport bindings normalize to the existing single persisted configuration."""

from typing import Any, Literal

from pydantic import ConfigDict, Field

from app.domain.basic_visualization_specs import (
    BasicSpec,
    CartesianSpec,
    PartToWholeSpec,
    ScatterSpec,
)
from app.domain.visualizations import VisualizationAppearance, VisualizationConfig

BASIC_TYPES = frozenset(
    {
        "bar_chart",
        "line_chart",
        "area_chart",
        "pie_chart",
        "donut_chart",
        "scatter_chart",
        "kpi",
        "table",
    }
)


class TableInputSpec(BasicSpec):
    type: Literal["table"] = "table"
    columns: list[str] | None = None


class KpiInputSpec(BasicSpec):
    type: Literal["kpi"] = "kpi"
    value: str | None = Field(default=None, min_length=1)


class BasicVisualizationInput(VisualizationAppearance):
    model_config = ConfigDict(extra="forbid")
    spec: CartesianSpec | PartToWholeSpec | ScatterSpec | KpiInputSpec | TableInputSpec
    measure_column_ids: list[str] | None = Field(default=None, min_length=2, max_length=8)
    grain_column_ids: list[str] | None = Field(default=None, max_length=8)


def canonical_visualization_input(value: Any, kind: str | None) -> Any:
    if isinstance(value, BasicVisualizationInput):
        value = value.model_dump(mode="json", exclude_unset=True)
    if not isinstance(value, dict) or not isinstance(value.get("spec"), dict):
        return value
    spec_type = value["spec"].get("type", kind)
    if spec_type not in BASIC_TYPES:
        return value
    # Extra-forbid rejects even equal duplicated legacy selectors: one binding source per request.
    typed = BasicVisualizationInput.model_validate(
        {**value, "spec": {**value["spec"], "type": spec_type}}
    )
    spec = typed.spec
    if spec.type != kind:
        raise ValueError("The visualization type does not match its typed specification.")
    config = typed.model_dump(exclude={"spec"}, exclude_unset=True)
    if isinstance(spec, CartesianSpec):
        if spec.type == "area_chart" and len(spec.y) != 1:
            raise ValueError("Multiple series require Bar or Line.")
        if len({series.column_id for series in spec.y}) != len(spec.y):
            raise ValueError("Series fields must be unique.")
        config.update(category_column_id=spec.x, value_column_id=spec.y[0].column_id)
        if spec.y[0].name:
            config["primary_series_name"] = spec.y[0].name
        config["additional_series"] = [series.model_dump() for series in spec.y[1:]]
    elif isinstance(spec, PartToWholeSpec):
        config.update(category_column_id=spec.category, value_column_id=spec.value)
    elif isinstance(spec, ScatterSpec):
        config.update(category_column_id=spec.x, value_column_id=spec.y)
    elif isinstance(spec, KpiInputSpec):
        config["value_column_id"] = spec.value
    elif isinstance(spec, TableInputSpec):
        if spec.columns is not None and (
            len(set(spec.columns)) != len(spec.columns) or any(not name for name in spec.columns)
        ):
            raise ValueError("Select unique non-empty table fields.")
        config["column_ids"] = spec.columns
    return VisualizationConfig.model_validate(config)
