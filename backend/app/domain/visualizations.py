import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.visualization_specs import VisualizationSpec
from app.domain.workflows import NodeInstance

ChartType = Literal[
    "bar_chart",
    "kpi",
    "table",
    "line_chart",
    "area_chart",
    "pie_chart",
    "donut_chart",
    "scatter_chart",
    "box_plot",
    "histogram_chart",
    "heatmap_chart",
    "radar_chart",
    "waterfall_chart",
    "combo_chart",
    "bubble_chart",
    "pareto_chart",
    "treemap_chart",
    "sunburst_chart",
    "bullet_chart",
    "funnel_chart",
    "analytical_table",
]
CHART_NAMES: dict[ChartType, str] = {
    "bar_chart": "Bar Chart",
    "kpi": "KPI",
    "table": "Table",
    "line_chart": "Line Chart",
    "area_chart": "Area Chart",
    "pie_chart": "Pie Chart",
    "donut_chart": "Donut Chart",
    "scatter_chart": "Scatter Chart",
    "box_plot": "Box plot",
    "histogram_chart": "Histogram",
    "heatmap_chart": "Heatmap",
    "radar_chart": "Radar",
    "waterfall_chart": "Waterfall",
    "combo_chart": "Combination chart",
    "bubble_chart": "Bubble chart",
    "pareto_chart": "Pareto chart",
    "treemap_chart": "Treemap",
    "sunburst_chart": "Sunburst",
    "bullet_chart": "Bullet chart",
    "funnel_chart": "Funnel",
    "analytical_table": "Analytical table",
}
CHART_TYPES = tuple(CHART_NAMES)
TITLE_PARAMETER = re.compile(r"\{([A-Za-z][A-Za-z0-9_]{0,63})\}")


class NumberFormatConfig(BaseModel):
    number_format: Literal["number", "currency", "percent"] = "number"
    decimals: int = Field(default=2, ge=0, le=8)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")


class VisualizationAppearance(NumberFormatConfig):
    title: str = Field(default="", max_length=200)
    title_template: bool = False
    highlight_column_id: str | None = Field(default=None, min_length=1)
    highlight_parameter: str | None = Field(default=None, min_length=1, max_length=64)
    context_column_ids: list[str] = Field(default_factory=list, max_length=64)
    column_formats: dict[str, NumberFormatConfig] = Field(default_factory=dict, max_length=1024)
    orientation: Literal["vertical", "horizontal"] = "vertical"
    show_legend: bool = True
    show_labels: bool = False


class AdditionalSeries(BaseModel):
    column_id: str = Field(min_length=1)
    name: str = Field(default="", max_length=200)


class VisualizationConfig(VisualizationAppearance):
    primary_series_name: str | None = Field(
        default=None, max_length=200, exclude_if=lambda value: value is None
    )
    spec: VisualizationSpec | None = Field(default=None, exclude_if=lambda value: value is None)
    measure_column_ids: list[str] | None = Field(
        default=None, min_length=2, max_length=8, exclude_if=lambda value: value is None
    )
    grain_column_ids: list[str] | None = Field(
        default=None, max_length=8, exclude_if=lambda value: value is None
    )
    additional_series: list[AdditionalSeries] = Field(
        default_factory=list, max_length=7, exclude_if=lambda value: not value
    )
    value_column_id: str | None = Field(default=None, min_length=1)
    category_column_id: str | None = Field(default=None, min_length=1)
    column_ids: list[str] | None = None


class BoundVisualizationConfig(VisualizationAppearance):
    """Bindings live exclusively in graph edges, never in duplicate config selectors."""

    model_config = ConfigDict(extra="forbid")


def bound_column_id(node: NodeInstance, port: str) -> str:
    return f"viz_{node.id.hex}_{port}"


def effective_visualization_config(node: NodeInstance) -> VisualizationConfig:
    if node.version == 2 and node.type in {"bar_chart", "kpi"}:
        appearance = BoundVisualizationConfig.model_validate(node.config)
        return VisualizationConfig(
            **appearance.model_dump(),
            value_column_id=bound_column_id(node, "value"),
            category_column_id=bound_column_id(node, "category")
            if node.type == "bar_chart"
            else None,
        )
    return VisualizationConfig.model_validate(node.config)
