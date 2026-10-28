"""Immutable templates of wizard-compatible grouped and formula report settings."""

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.analytical_templates import TemplateField
from app.schemas.report_builder import ReportSettings


class ReportTemplate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    name: str = Field(min_length=1, max_length=200, pattern=r"\S")
    input_grain: str = Field(min_length=1, max_length=500, pattern=r"\S")
    fields: list[TemplateField] = Field(max_length=96)
    settings: ReportSettings


class ReportTemplateRead(ReportTemplate):
    id: uuid.UUID
    revision: int = Field(default=1, ge=1)


class ReportTemplateList(BaseModel):
    items: list[ReportTemplateRead]
