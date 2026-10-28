"""Supported source-cell appearance changes; number formats are intentionally excluded."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CellFormatPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    bold: bool | None = Field(default=None, strict=True)
    italic: bool | None = Field(default=None, strict=True)
    wrap: bool | None = Field(default=None, strict=True)
    size: float | None = Field(default=None, ge=6, le=72, allow_inf_nan=False)
    color: str | None = Field(default=None, pattern=r"^(#[0-9a-fA-F]{6}|auto)$")
    background: str | None = Field(default=None, pattern=r"^(#[0-9a-fA-F]{6}|none)$")
    alignment: Literal["general", "left", "center", "right"] | None = None
