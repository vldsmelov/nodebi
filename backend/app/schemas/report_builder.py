import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.visualization_specs import ComboSpec, RadarSpec
from app.nodes.exact_calculated_column import ExactCalculatedColumnConfig
from app.nodes.filter import FilterCondition
from app.nodes.group_by import Aggregation
from app.nodes.period_comparison import CalendarPeriodConfig
from app.schemas.dashboards import VisualizationResult
from app.schemas.workflows import ResolvedColumnRead, WorkflowSave


class ReportMeasure(Aggregation):
    output_id: uuid.UUID | None = None


class ReportFormula(ExactCalculatedColumnConfig):
    node_id: uuid.UUID


class ReportComparison(CalendarPeriodConfig):
    value_column_id: str = Field(min_length=1)
    compare_to: Literal["previous_period", "previous_year"] = "previous_period"
    name: str = Field(default="Comparison", min_length=1, max_length=150)
    ratio_scale: int = Field(default=6, ge=0, le=18, strict=True)


class ReportSettings(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=200)
    dimensions: list[str] = Field(default_factory=list, max_length=8)
    measures: list[ReportMeasure] = Field(min_length=1, max_length=16)
    row_formulas: list[ReportFormula] = Field(default_factory=list, max_length=16)
    summary_formulas: list[ReportFormula] = Field(default_factory=list, max_length=16)
    value_field_id: str | None = None
    filters: list[FilterCondition] = Field(default_factory=list, max_length=32)
    presentation: Literal[
        "table", "bar_chart", "line_chart", "kpi", "combo_chart", "radar_chart"
    ] = "table"
    combo: ComboSpec | None = Field(default=None, exclude_if=lambda v: v is None)
    radar: RadarSpec | None = Field(default=None, exclude_if=lambda v: v is None)
    decimal_average_scale: int = Field(default=6, ge=0, le=18)
    comparison: ReportComparison | None = None

    @model_validator(mode="after")
    def unique_identities(self) -> "ReportSettings":
        if self.presentation == "radar_chart":
            if self.radar is None or self.dimensions != [self.radar.profile_column_id]:
                raise ValueError(
                    "Radar reports require one profile dimension and explicit axis scales."
                )
            if self.comparison:
                raise ValueError("Period comparison requires a table, Bar or Line chart.")
        elif self.radar is not None:
            raise ValueError("Radar bindings require a radar presentation.")
        if self.presentation == "combo_chart":
            if self.combo is None or self.dimensions != [self.combo.category_column_id]:
                raise ValueError(
                    "Combination reports require one dimension and explicit bar/line bindings."
                )
            if self.comparison:
                raise ValueError(
                    "Period comparisons use Table, Bar or Line. For plan-fact, select two measures."
                )
        elif self.combo is not None:
            raise ValueError("Combination bindings require a combination presentation.")
        if self.comparison:
            if self.comparison.date_column_id not in self.dimensions:
                raise ValueError("Include the comparison date field in grouping dimensions.")
            if self.presentation == "kpi":
                raise ValueError("Period comparison requires a table, Bar or Line chart.")
            if self.presentation != "table" and self.dimensions != [self.comparison.date_column_id]:
                raise ValueError(
                    "Comparison charts require only the date dimension. Use a table for partitions."
                )
        identities = [f.node_id for f in [*self.row_formulas, *self.summary_formulas]]
        outputs = [m.output_id for m in self.measures if m.output_id is not None]
        if len(set(identities)) != len(identities) or len(set(outputs)) != len(outputs):
            raise ValueError("Formula and measure identities must be unique.")
        if outputs and len(outputs) != len(self.measures):
            raise ValueError("All measures must use the same identity contract.")
        if self.summary_formulas and not outputs:
            raise ValueError(
                "After-total formulas require stable measures. Legacy reports remain unchanged."
            )
        return self


class PublishedReportInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    workflow_id: uuid.UUID
    publication_id: uuid.UUID
    expected_token: str = Field(pattern="^[0-9a-f]{64}$")


class ReportInputChoice(BaseModel):
    workflow_id: uuid.UUID
    publication_id: uuid.UUID
    workflow_name: str
    name: str
    available: bool
    reason: str | None = None


class ReportInputList(BaseModel):
    items: list[ReportInputChoice]


class ReportInputRead(ReportInputChoice):
    expected_token: str
    columns: list[ResolvedColumnRead]
    uses_parameters: bool


class ReportSourceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: uuid.UUID
    source_id: uuid.UUID | None = None
    resource_id: str | None = Field(default=None, min_length=1, max_length=255)
    expected_snapshot_id: uuid.UUID | None = None
    published_input: PublishedReportInput | None = None

    @model_validator(mode="after")
    def one_input(self) -> "ReportSourceRequest":
        raw = (self.source_id, self.resource_id, self.expected_snapshot_id)
        if self.published_input is not None:
            if any(value is not None for value in raw):
                raise ValueError("Choose either an imported table or a prepared result.")
        elif not all(value is not None for value in raw):
            raise ValueError("Choose an imported table or a prepared result.")
        return self


class ReportBuildRequest(ReportSettings, ReportSourceRequest):
    pass


class ReportEditSettings(ReportSettings):
    rebind_fields: bool = False


class ReportEditRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: uuid.UUID
    expected_token: str = Field(pattern="^[0-9a-f]{64}$")
    settings: ReportEditSettings
    acknowledge_shared: bool = False


class ReportStep(BaseModel):
    node_id: uuid.UUID
    type: str
    editable: bool = False


class ReportEditRead(BaseModel):
    workflow_id: uuid.UUID
    visualization_id: uuid.UUID
    name: str
    expected_token: str
    editable: bool
    reason: str | None = None
    settings: ReportEditSettings | None = None
    columns: list[ResolvedColumnRead] = Field(default_factory=list)
    steps: list[ReportStep] = Field(default_factory=list)
    widget_count: int = 0
    analytical_editor: bool = False
    alignment_editor: bool = False


class ReportEditResult(BaseModel):
    workflow_id: uuid.UUID
    visualization_id: uuid.UUID
    workflow_revision: int
    visualization_revision: int
    dashboard_id: uuid.UUID | None = None


class ReportBuildPreview(BaseModel):
    graph: WorkflowSave
    columns: list[ResolvedColumnRead]
    rows: list[dict[str, Any]]
    total_rows: int
    steps: list[str]
    visualization: VisualizationResult | None = Field(default=None, exclude_if=lambda v: v is None)


class ReportFormulaFields(BaseModel):
    row_columns: list[ResolvedColumnRead]
    measure_columns: list[ResolvedColumnRead]
    row_outputs: dict[str, list[ResolvedColumnRead]] = Field(default_factory=dict)
    summary_outputs: dict[str, list[ResolvedColumnRead]] = Field(default_factory=dict)


class ReportBuildResult(BaseModel):
    workflow_id: uuid.UUID
    publication_id: uuid.UUID
    visualization_id: uuid.UUID
    dashboard_id: uuid.UUID
