import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.domain.dashboards import DashboardConfiguration, NavigationAction
from app.domain.parameters import ParameterValues
from app.domain.visualizations import ChartType, NumberFormatConfig
from app.schemas.workflows import ResolvedColumnRead, WorkflowCreate


class VisualizationRequest(BaseModel):
    parameters: ParameterValues = Field(default_factory=dict)
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=1000)


class VisualizationRead(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    node_id: uuid.UUID
    name: str
    type: ChartType


class VisualizationList(BaseModel):
    items: list[VisualizationRead]


class VisualizationResult(BaseModel):
    context_column_ids: list[str] = Field(default_factory=list)
    column_formats: dict[str, NumberFormatConfig] = Field(default_factory=dict)
    orientation: Literal["vertical", "horizontal"] = "vertical"
    visualization_id: uuid.UUID
    revision: int
    type: ChartType
    title: str
    value_field: str | None
    category_field: str | None
    number_format: Literal["number", "currency", "percent"]
    decimals: int
    currency: str
    show_legend: bool
    show_labels: bool
    total_rows: int
    offset: int
    limit: int
    truncated: bool
    columns: list[ResolvedColumnRead]
    rows: list[dict[str, Any]]


class WidgetConfig(BaseModel):
    show_title: bool = True
    action: NavigationAction | None = None


class WidgetPayload(BaseModel):
    id: uuid.UUID
    visualization_id: uuid.UUID
    title: str | None = Field(default=None, max_length=200)
    config: WidgetConfig = Field(default_factory=WidgetConfig)
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
    configuration: DashboardConfiguration | None = None
    expected_revision: int = Field(ge=1)
    widgets: list[WidgetPayload] = Field(max_length=100)


class DashboardRead(WorkflowCreate):
    configuration: DashboardConfiguration = Field(default_factory=DashboardConfiguration)
    id: uuid.UUID
    project_id: uuid.UUID
    revision: int
    widgets: list[WidgetPayload]


class DashboardList(BaseModel):
    items: list[DashboardRead]
