import re
from typing import Literal

from pydantic import BaseModel, Field

ChartType = Literal[
    "bar_chart",
    "kpi",
    "table",
    "line_chart",
    "area_chart",
    "pie_chart",
    "donut_chart",
    "scatter_chart",
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
}
CHART_TYPES = tuple(CHART_NAMES)
TITLE_PARAMETER = re.compile(r"\{([A-Za-z][A-Za-z0-9_]{0,63})\}")


class NumberFormatConfig(BaseModel):
    number_format: Literal["number", "currency", "percent"] = "number"
    decimals: int = Field(default=2, ge=0, le=8)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")


class VisualizationConfig(NumberFormatConfig):
    title: str = Field(default="", max_length=200)
    title_template: bool = False
    highlight_column_id: str | None = Field(default=None, min_length=1)
    highlight_parameter: str | None = Field(default=None, min_length=1, max_length=64)
    value_column_id: str | None = Field(default=None, min_length=1)
    category_column_id: str | None = Field(default=None, min_length=1)
    column_ids: list[str] | None = None
    context_column_ids: list[str] = Field(default_factory=list, max_length=64)
    column_formats: dict[str, NumberFormatConfig] = Field(default_factory=dict, max_length=1024)
    orientation: Literal["vertical", "horizontal"] = "vertical"
    show_legend: bool = True
    show_labels: bool = False
