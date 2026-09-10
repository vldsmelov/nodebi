import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.workflows import ResolvedColumnRead, WorkflowCreate


class VisualizationRead(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    node_id: uuid.UUID
    name: str
    type: Literal["bar_chart", "kpi"]


class VisualizationList(BaseModel):
    items: list[VisualizationRead]


class VisualizationResult(BaseModel):
    visualization_id: uuid.UUID
    revision: int
    type: Literal["bar_chart", "kpi"]
    title: str
    value_field: str
    category_field: str | None
    number_format: Literal["number", "currency", "percent"]
    decimals: int
    currency: str
    columns: list[ResolvedColumnRead]
    rows: list[dict[str, Any]]


class WidgetPayload(BaseModel):
    id: uuid.UUID
    visualization_id: uuid.UUID
    x: int = Field(ge=0, le=11, strict=True)
    y: int = Field(ge=0, le=10000, strict=True)
    width: int = Field(ge=2, le=12, strict=True)
    height: int = Field(ge=2, le=40, strict=True)

    @model_validator(mode="after")
    def within_grid(self) -> "WidgetPayload":
        if self.x + self.width > 12:
            raise ValueError("Widget extends beyond the 12-column grid.")
        return self


class DashboardSave(WorkflowCreate):
    expected_revision: int = Field(ge=1)
    widgets: list[WidgetPayload] = Field(max_length=100)


class DashboardRead(WorkflowCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    revision: int
    widgets: list[WidgetPayload]


class DashboardList(BaseModel):
    items: list[DashboardRead]
