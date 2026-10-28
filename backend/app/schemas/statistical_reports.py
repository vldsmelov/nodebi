"""Guided analytical settings compile into existing preparation graph nodes."""

import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.funnel import FunnelConfig
from app.nodes.boxplot_stats import BoxPlotStatsConfig
from app.nodes.filter import FilterCondition
from app.nodes.heatmap import HeatmapConfig
from app.nodes.histogram import HistogramConfig
from app.nodes.pareto import ParetoConfig
from app.nodes.table_rollup import TableRollupConfig
from app.nodes.waterfall import WaterfallConfig
from app.schemas.dashboards import VisualizationResult
from app.schemas.report_builder import ReportSourceRequest, ReportStep
from app.schemas.workflows import ResolvedColumnRead, WorkflowSave


class HistogramReportSettings(HistogramConfig):
    type: Literal["histogram"] = "histogram"


class BoxPlotReportSettings(BoxPlotStatsConfig):
    type: Literal["boxplot_stats"] = "boxplot_stats"


class HeatmapReportSettings(HeatmapConfig):
    type: Literal["heatmap_stats"] = "heatmap_stats"


class RollupReportSettings(TableRollupConfig):
    type: Literal["table_rollup"] = "table_rollup"


class ParetoReportSettings(ParetoConfig):
    type: Literal["pareto"] = "pareto"


class FunnelReportSettings(FunnelConfig):
    type: Literal["funnel_steps"] = "funnel_steps"


class WaterfallReportSettings(WaterfallConfig):
    type: Literal["waterfall_steps"] = "waterfall_steps"
    # Required choice: null explicitly retains input order; a field means unique ascending order.
    order_column_id: str | None = Field(min_length=1)


class HierarchyReportSettings(TableRollupConfig):
    type: Literal["treemap_chart", "sunburst_chart"]

    @model_validator(mode="after")
    def additive_complete_hierarchy(self) -> "HierarchyReportSettings":
        if (
            not self.dimensions
            or not self.subtotals
            or not self.grand_total
            or len(self.measures) != 1
            or self.measures[0].operation not in {"sum", "count", "count_rows"}
        ):
            raise ValueError(
                "Choose grouping levels and one sum or count; hierarchy requires all totals."
            )
        return self


AnalysisSettings = Annotated[
    HistogramReportSettings
    | BoxPlotReportSettings
    | HeatmapReportSettings
    | RollupReportSettings
    | ParetoReportSettings
    | FunnelReportSettings
    | WaterfallReportSettings
    | HierarchyReportSettings,
    Field(discriminator="type"),
]


class StatisticalSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=200, pattern=r"\S")
    analysis: AnalysisSettings
    filters: list[FilterCondition] = Field(default_factory=list, max_length=32)


class StatisticalReportRequest(StatisticalSettings, ReportSourceRequest):
    pass


class StatisticalEditRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: uuid.UUID
    expected_token: str = Field(pattern="^[0-9a-f]{64}$")
    settings: StatisticalSettings
    acknowledge_shared: bool = False
    rebind_fields: bool = False


class StatisticalEditRead(BaseModel):
    workflow_id: uuid.UUID
    visualization_id: uuid.UUID
    name: str
    expected_token: str
    editable: bool
    reason: str | None = None
    settings: StatisticalSettings | None = None
    columns: list[ResolvedColumnRead] = Field(default_factory=list)
    steps: list[ReportStep] = Field(default_factory=list)
    widget_count: int = 0


class StatisticalReportPreview(BaseModel):
    graph: WorkflowSave
    result: VisualizationResult
    steps: list[str]
