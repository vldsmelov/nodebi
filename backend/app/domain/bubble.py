"""Semantic bubble roles and bounded drawing coordinates; no renderer-specific options."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.parameters import ParameterValue


class BubbleSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["bubble_chart"] = "bubble_chart"
    key_column_id: str = Field(min_length=1)
    x_column_id: str = Field(min_length=1)
    y_column_id: str = Field(min_length=1)
    size_column_id: str = Field(min_length=1)
    label_column_id: str | None = Field(default=None, min_length=1)
    group_column_id: str | None = Field(default=None, min_length=1)
    size_encoding: Literal["area"] = "area"


class BubbleTick(BaseModel):
    position: float
    label: str
    display_label: str | None = None


class BubbleAxis(BaseModel):
    minimum: str | None
    maximum: str | None
    ticks: list[BubbleTick]
    zero_position: float | None
    label_offset: str | None = None


class BubblePoint(BaseModel):
    id: str
    key: ParameterValue
    group_id: str | None
    x: float | None
    y: float | None
    radius_ratio: float | None
    state: Literal["visible", "zero_size", "missing"]


class BubblePresentation(BaseModel):
    x_axis: BubbleAxis
    y_axis: BubbleAxis
    size_maximum: str | None
    input_count: int
    missing_count: int
    zero_size_count: int
    visible_count: int
    group_count: int
    points: list[BubblePoint]
