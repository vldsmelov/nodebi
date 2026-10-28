"""Read-side semantic roles for existing visualization contracts.

These specs describe already-prepared rows. They never aggregate data or replace saved configs.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BasicSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1


class BasicSeries(BaseModel):
    model_config = ConfigDict(extra="forbid")
    column_id: str = Field(min_length=1)
    name: str = ""


class CartesianSpec(BasicSpec):
    type: Literal["bar_chart", "line_chart", "area_chart"]
    x: str = Field(min_length=1)
    y: list[BasicSeries] = Field(min_length=1, max_length=8)


class PartToWholeSpec(BasicSpec):
    type: Literal["pie_chart", "donut_chart"]
    category: str = Field(min_length=1)
    value: str = Field(min_length=1)


class ScatterSpec(BasicSpec):
    type: Literal["scatter_chart"] = "scatter_chart"
    x: str = Field(min_length=1)
    y: str = Field(min_length=1)


class KpiSpec(BasicSpec):
    type: Literal["kpi"] = "kpi"
    value: str = Field(min_length=1)


class TableSpec(BasicSpec):
    type: Literal["table"] = "table"
    columns: list[str]


BasicVisualizationSpec = CartesianSpec | PartToWholeSpec | ScatterSpec | KpiSpec | TableSpec
