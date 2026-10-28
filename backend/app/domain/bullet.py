"""Typed fact/target/range semantics, independent of a rendering library."""

import re
from fractions import Fraction
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.bubble import BubbleTick

DECIMAL = r"[+-]?(?:\d{1,38}(?:\.\d{1,38})?|\.\d{1,38})"


class BulletBand(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str = Field(min_length=1, max_length=80)
    upper: str = Field(min_length=1, max_length=78)
    tone: Literal["neutral", "negative", "warning", "positive"] = "neutral"

    @model_validator(mode="after")
    def valid(self) -> "BulletBand":
        if not self.label.strip() or not re.fullmatch(DECIMAL, self.upper):
            raise ValueError("Enter a range label and a plain decimal upper bound.")
        return self


class BulletSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["bullet_chart"] = "bullet_chart"
    category_column_id: str = Field(min_length=1)
    actual_column_id: str = Field(min_length=1)
    target_column_id: str = Field(min_length=1)
    minimum: str = Field(default="0", max_length=78)
    maximum: str = Field(max_length=78)
    bands: list[BulletBand] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def ordered_ranges(self) -> "BulletSpec":
        if self.category_column_id in {self.actual_column_id, self.target_column_id}:
            raise ValueError("Choose separate bullet category and numeric fields.")
        if any(not re.fullmatch(DECIMAL, bound) for bound in (self.minimum, self.maximum)):
            raise ValueError("Enter bullet scale bounds as plain decimal numbers.")
        lower, upper = Fraction(self.minimum), Fraction(self.maximum)
        if not lower <= 0 <= upper or lower >= upper:
            raise ValueError("The bullet scale must increase and include zero.")
        bounds = [lower, *(Fraction(band.upper) for band in self.bands)]
        if any(a >= b for a, b in zip(bounds, bounds[1:], strict=False)) or bounds[-1] != upper:
            raise ValueError("Bullet ranges must increase and end at the scale maximum.")
        if len({band.label.strip() for band in self.bands}) != len(self.bands):
            raise ValueError("Give bullet ranges distinct labels.")
        return self


class BulletPoint(BaseModel):
    id: str
    actual: float | None
    target: float | None
    actual_band: int | None
    actual_zero: bool


class BulletPresentation(BaseModel):
    zero: float
    ticks: list[BubbleTick]
    band_ends: list[float]
    input_count: int
    missing_actual_count: int
    missing_target_count: int
    points: list[BulletPoint]
