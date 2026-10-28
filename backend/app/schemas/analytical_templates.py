"""Immutable project-local templates of ordinary analytical node settings."""

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.datasets import LogicalType
from app.schemas.report_builder import ReportSourceRequest
from app.schemas.statistical_reports import StatisticalSettings


class TemplateField(BaseModel):
    model_config = ConfigDict(extra="forbid")
    key: str
    name: str
    logical_type: LogicalType
    unit: str | None = None
    currency: str | None = None


class AnalyticalTemplate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    name: str = Field(min_length=1, max_length=200, pattern=r"\S")
    input_grain: str = Field(min_length=1, max_length=500, pattern=r"\S")
    fields: list[TemplateField] = Field(max_length=96)
    settings: StatisticalSettings


class TemplateRead(AnalyticalTemplate):
    id: uuid.UUID
    revision: int = Field(default=1, ge=1)


class TemplateList(BaseModel):
    items: list[TemplateRead]


class TemplateCapture(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: uuid.UUID
    visualization_id: uuid.UUID
    expected_token: str = Field(pattern="^[0-9a-f]{64}$")
    name: str = Field(min_length=1, max_length=200, pattern=r"\S")
    input_grain: str = Field(min_length=1, max_length=500, pattern=r"\S")


class TemplatePrepare(ReportSourceRequest):
    mapping: dict[str, str] = Field(max_length=96)
    acknowledge_grain: bool = False
    expected_template_revision: int | None = Field(default=None, ge=1, strict=True)
