import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.publications import MeasureDefinition


class MeasureEntry(BaseModel):
    workflow_id: uuid.UUID
    publication_id: uuid.UUID
    workflow_name: str
    publication_name: str
    definition: MeasureDefinition


class MeasureList(BaseModel):
    items: list[MeasureEntry]
    expected_token: str


class MeasureSave(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_token: str = Field(pattern="^[0-9a-f]{64}$")
    definition: MeasureDefinition


class MeasureReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    request_id: uuid.UUID
    workflow_id: uuid.UUID
    publication_id: uuid.UUID
    measure_id: uuid.UUID
    additional_measure_ids: list[uuid.UUID] = Field(default_factory=list, max_length=7)
    expected_token: str = Field(pattern="^[0-9a-f]{64}$")
    name: str = Field(min_length=1, max_length=200)
    presentation: Literal["table", "kpi", "bar_chart", "line_chart"] = "table"

    @model_validator(mode="after")
    def compatible_selection(self) -> "MeasureReportRequest":
        ids = [self.measure_id, *self.additional_measure_ids]
        if len(ids) != len(set(ids)):
            raise ValueError("Select each reusable measure only once.")
        if self.additional_measure_ids and self.presentation != "table":
            raise ValueError("Multiple reusable measures currently require a table.")
        return self
