import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator, model_validator

from app.domain.basic_visualization_specs import BasicVisualizationSpec
from app.domain.bubble import BubblePresentation
from app.domain.bullet import BulletPresentation
from app.domain.dashboards import DashboardConfiguration, NavigationAction
from app.domain.funnel import FunnelPresentation
from app.domain.hierarchy import HierarchyPresentation
from app.domain.parameters import ParameterDefinition, ParameterValue, ParameterValues
from app.domain.publications import ViewContext
from app.domain.visualization_inputs import BasicVisualizationInput, canonical_visualization_input
from app.domain.visualization_specs import VisualizationSpec
from app.domain.visualizations import ChartType, NumberFormatConfig, VisualizationConfig
from app.schemas.workflows import ResolvedColumnRead, WorkflowCreate


class VisualizationRequest(BaseModel):
    context: ViewContext = Field(default_factory=ViewContext)
    parameters: ParameterValues = Field(default_factory=dict)
    offset: int = Field(default=0, ge=0, le=2**63 - 1)
    limit: int = Field(default=100, ge=1, le=1000)


class VisualizationRead(BaseModel):
    publication_id: uuid.UUID | None = None
    revision: int = 1
    config: VisualizationConfig | None = None
    id: uuid.UUID
    workflow_id: uuid.UUID
    node_id: uuid.UUID
    name: str
    type: ChartType


class VisualizationList(BaseModel):
    items: list[VisualizationRead]


class SeriesField(BaseModel):
    field: str
    name: str


class VisualizationDataset(BaseModel):
    columns: list[ResolvedColumnRead]
    rows: list[dict[str, Any]]
    total_rows: int
    offset: int
    limit: int
    truncated: bool


class HeatmapScaleResult(BaseModel):
    mode: Literal["extent", "zero_centered", "fixed"]
    minimum: str | None
    maximum: str | None
    positions: dict[str, float | None]
    below_count: int = 0
    above_count: int = 0


class RadarProfileResult(BaseModel):
    id: str
    category: ParameterValue
    positions: list[float | None]
    complete: bool


class RadarPresentation(BaseModel):
    profiles: list[RadarProfileResult]
    incomplete_count: int


class WaterfallPosition(BaseModel):
    start: float
    end: float
    sign: Literal[-1, 0, 1]


class WaterfallTick(BaseModel):
    position: float
    label: str


class WaterfallScale(BaseModel):
    minimum: str
    maximum: str
    zero: float
    ticks: list[WaterfallTick]
    positions: dict[str, WaterfallPosition]


class ComboTick(BaseModel):
    position: float
    label: str


class ComboScale(BaseModel):
    minimum: str
    maximum: str
    lower: float
    upper: float
    ticks: list[ComboTick]


class ComboObservation(BaseModel):
    id: str
    positions: list[float | None]


class ComboPresentation(BaseModel):
    primary: ComboScale
    secondary: ComboScale | None = None
    observations: list[ComboObservation]


class TableCellFormat(BaseModel):
    rule_id: uuid.UUID
    label: str
    tone: Literal["positive", "warning", "negative", "neutral"]


class AnalyticalTablePresentation(BaseModel):
    cells: dict[str, dict[str, TableCellFormat]] = Field(default_factory=dict)


class VisualizationResult(BaseModel):
    funnel: FunnelPresentation | None = Field(default=None, exclude_if=lambda value: value is None)
    bullet: BulletPresentation | None = Field(default=None, exclude_if=lambda value: value is None)
    hierarchy: HierarchyPresentation | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    bubble: BubblePresentation | None = Field(default=None, exclude_if=lambda value: value is None)
    analytical_table: AnalyticalTablePresentation | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    combo: ComboPresentation | None = Field(default=None, exclude_if=lambda value: value is None)
    waterfall_scale: WaterfallScale | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    radar: RadarPresentation | None = Field(default=None, exclude_if=lambda value: value is None)
    heatmap_scale: HeatmapScaleResult | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    spec: VisualizationSpec | BasicVisualizationSpec | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    datasets: dict[str, VisualizationDataset] = Field(
        default_factory=dict, exclude_if=lambda value: not value
    )
    additional_series: list[SeriesField] = Field(
        default_factory=list, exclude_if=lambda value: not value
    )
    visualization_revision: int = 1
    applied_context: list[str] = Field(default_factory=list)
    unsupported_filters: list[str] = Field(default_factory=list)
    highlight_field: str | None = None
    highlight_value: ParameterValue = None
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
    highlight_only: list[str] = Field(default_factory=list, max_length=1)
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


class DashboardVisualizationCreate(BaseModel):
    workflow_id: uuid.UUID
    expected_workflow_revision: int = Field(ge=1)
    expected_dashboard_revision: int = Field(ge=1)
    source_node_id: uuid.UUID
    node_id: uuid.UUID
    edge_id: uuid.UUID
    widget_id: uuid.UUID
    replace_existing: bool = False
    type: ChartType
    config: dict[str, Any] = Field(default_factory=dict)


class IndependentVisualizationSave(BaseModel):
    request_id: uuid.UUID | None = None
    workflow_id: uuid.UUID
    publication_id: uuid.UUID
    expected_workflow_revision: int = Field(ge=1)
    expected_revision: int = Field(default=1, ge=1)
    name: str = Field(min_length=1, max_length=200)
    type: ChartType
    config: VisualizationConfig

    @field_validator(
        "config",
        mode="before",
        json_schema_input_type=VisualizationConfig | BasicVisualizationInput,
    )
    @classmethod
    def normalize_bindings(cls, value: Any, info: ValidationInfo) -> Any:
        return canonical_visualization_input(value, info.data.get("type"))


class IndependentVisualizationPreview(IndependentVisualizationSave):
    context: ViewContext = Field(default_factory=ViewContext)
    parameters: ParameterValues = Field(default_factory=dict)


class DashboardNavigationSave(BaseModel):
    workflow_id: uuid.UUID
    widget_id: uuid.UUID
    expected_workflow_revision: int = Field(ge=1)
    expected_dashboard_revision: int = Field(ge=1)
    expected_target_revision: int = Field(ge=1)
    add_context_column_ids: list[str] = Field(min_length=1, max_length=64)
    action: NavigationAction
    parameters: ParameterValues = Field(default_factory=dict)
    acknowledge_shared: bool = False


class PublicationSchema(BaseModel):
    suggested_specs: list[VisualizationSpec] = Field(
        default_factory=list, exclude_if=lambda value: not value
    )
    workflow_revision: int
    kind: str
    columns: list[ResolvedColumnRead]
    roles: list[ParameterDefinition]
    period_supported: bool
