"""Versioned semantic bindings, never renderer-specific options or calculations."""

import re
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.bubble import BubbleSpec
from app.domain.bullet import BulletSpec
from app.domain.funnel import FunnelSpec


class BoxSummaryRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    group_id: str = Field(min_length=1)
    group: str = Field(min_length=1)
    count: str = Field(min_length=1)
    missing_count: str = Field(min_length=1)
    minimum: str = Field(min_length=1)
    lower_whisker: str = Field(min_length=1)
    q1: str = Field(min_length=1)
    median: str = Field(min_length=1)
    q3: str = Field(min_length=1)
    upper_whisker: str = Field(min_length=1)
    maximum: str = Field(min_length=1)
    outlier_count: str = Field(min_length=1)


class BoxOutlierRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    group_id: str = Field(min_length=1)
    group: str = Field(min_length=1)
    point_id: str = Field(min_length=1)
    value: str = Field(min_length=1)


class BoxPlotSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["box_plot"] = "box_plot"
    summary: BoxSummaryRoles
    outliers: BoxOutlierRoles


class HistogramRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    bin_id: str
    bin_index: str
    lower: str
    upper: str
    upper_inclusive: str
    interval: str
    count: str


class HistogramSummaryRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input_count: str
    valid_count: str
    missing_count: str
    included_count: str
    below_count: str
    above_count: str
    bin_count: str
    range_min: str
    range_max: str


class HistogramSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["histogram_chart"] = "histogram_chart"
    bins: HistogramRoles
    summary: HistogramSummaryRoles


# Disjoint role models keep legacy BoxPlotSpec defaults valid when clients omit its type tag.
class HeatmapRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cell_id: str = Field(min_length=1)
    x_id: str = Field(min_length=1)
    y_id: str = Field(min_length=1)
    x: str = Field(min_length=1)
    y: str = Field(min_length=1)
    value: str = Field(min_length=1)
    present: str = Field(min_length=1)
    row_count: str = Field(min_length=1)
    valid_count: str = Field(min_length=1)
    missing_count: str = Field(min_length=1)


class HeatmapColorScale(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mode: Literal["extent", "zero_centered", "fixed"] = "extent"
    minimum: str | None = Field(default=None, max_length=78)
    maximum: str | None = Field(default=None, max_length=78)

    @model_validator(mode="after")
    def valid_bounds(self) -> "HeatmapColorScale":
        if self.mode != "fixed":
            if self.minimum is not None or self.maximum is not None:
                raise ValueError("Explicit colour bounds require the fixed scale mode.")
            return self
        pattern = r"[+-]?(?:\d{1,38}(?:\.\d{1,38})?|\.\d{1,38})"
        if any(
            value is None or not re.fullmatch(pattern, value)
            for value in (self.minimum, self.maximum)
        ):
            raise ValueError("Enter both colour bounds as plain decimal numbers.")
        assert self.minimum is not None and self.maximum is not None
        if Decimal(self.minimum) >= Decimal(self.maximum):
            raise ValueError("The colour maximum must exceed the minimum.")
        return self


class HeatmapSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["heatmap_chart"] = "heatmap_chart"
    cells: HeatmapRoles
    color_scale: HeatmapColorScale = Field(default_factory=HeatmapColorScale)


class RadarAxis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    column_id: str = Field(min_length=1)
    minimum: str = Field(min_length=1, max_length=78)
    maximum: str = Field(min_length=1, max_length=78)

    @model_validator(mode="after")
    def valid_bounds(self) -> "RadarAxis":
        pattern = r"[+-]?(?:\d{1,38}(?:\.\d{1,38})?|\.\d{1,38})"
        if not all(re.fullmatch(pattern, value) for value in (self.minimum, self.maximum)):
            raise ValueError("Enter radar bounds as plain decimal numbers.")
        if Decimal(self.minimum) >= Decimal(self.maximum):
            raise ValueError("Each radar maximum must exceed its minimum.")
        return self


class RadarSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["radar_chart"] = "radar_chart"
    profile_column_id: str = Field(min_length=1)
    normalization: Literal["shared", "min_max"]
    axes: list[RadarAxis] = Field(min_length=3, max_length=8)

    @model_validator(mode="after")
    def distinct_axes(self) -> "RadarSpec":
        ids = [axis.column_id for axis in self.axes]
        if len(set(ids)) != len(ids) or self.profile_column_id in ids:
            raise ValueError("Choose separate radar profile and axis fields.")
        if (
            self.normalization == "shared"
            and len({(Decimal(axis.minimum), Decimal(axis.maximum)) for axis in self.axes}) != 1
        ):
            raise ValueError("Shared radar scale requires identical bounds on every axis.")
        return self


class WaterfallRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    step_id: str = Field(min_length=1)
    step_index: str = Field(min_length=1)
    category: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    value: str = Field(min_length=1)
    start: str = Field(min_length=1)
    end: str = Field(min_length=1)
    balance: str = Field(min_length=1)
    generated: str = Field(min_length=1)


class WaterfallSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["waterfall_chart"] = "waterfall_chart"
    steps: WaterfallRoles


class ComboSeries(BaseModel):
    model_config = ConfigDict(extra="forbid")
    column_id: str = Field(min_length=1)
    kind: Literal["bar", "line"]
    axis: Literal["primary", "secondary"] = "primary"
    name: str = Field(default="", max_length=200)


class ComboSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["combo_chart"] = "combo_chart"
    category_column_id: str = Field(min_length=1)
    secondary_axis: bool = False
    series: list[ComboSeries] = Field(min_length=2, max_length=8)

    @model_validator(mode="after")
    def explicit_series(self) -> "ComboSpec":
        ids = [item.column_id for item in self.series]
        if len(set(ids)) != len(ids) or self.category_column_id in ids:
            raise ValueError("Choose separate combination category and measure fields.")
        if {item.kind for item in self.series} != {"bar", "line"}:
            raise ValueError("A combination chart needs both bar and line series.")
        axes = {item.axis for item in self.series}
        if axes != ({"primary", "secondary"} if self.secondary_axis else {"primary"}):
            raise ValueError("Enable the second axis explicitly and assign series to both axes.")
        return self


class ParetoRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    point_id: str
    rank: str
    category: str
    value: str
    cumulative_value: str
    share_percent: str
    cumulative_percent: str
    share_exact: str
    cumulative_exact: str


class ParetoSummaryRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input_count: str
    zero_count: str
    total_value: str


class ParetoSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["pareto_chart"] = "pareto_chart"
    rows: ParetoRoles
    summary: ParetoSummaryRoles
    threshold_percent: int = Field(default=80, ge=1, le=100, strict=True)


def pareto_spec(node_id: UUID) -> ParetoSpec:
    prefix = f"pareto_{node_id.hex}_"
    return ParetoSpec(
        rows=ParetoRoles.model_validate({name: prefix + name for name in ParetoRoles.model_fields}),
        summary=ParetoSummaryRoles.model_validate(
            {name: prefix + name for name in ParetoSummaryRoles.model_fields}
        ),
    )


class AnalyticalRowRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    row_id: str = Field(min_length=1)
    parent_id: str = Field(min_length=1)
    depth: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    source_count: str = Field(min_length=1)


class TableFormatRule(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    column_id: str = Field(min_length=1)
    label: str = Field(min_length=1, max_length=80)
    operator: Literal["lt", "lte", "eq", "gte", "gt", "between", "is_empty"]
    threshold: str | None = Field(default=None, max_length=78)
    upper: str | None = Field(default=None, max_length=78)
    scope: Literal["all", "details", "totals"] = "all"
    tone: Literal["positive", "warning", "negative", "neutral"] = "neutral"

    @model_validator(mode="after")
    def valid_thresholds(self) -> "TableFormatRule":
        if not self.label.strip():
            raise ValueError("Enter a conditional-format rule label.")
        if self.operator == "is_empty":
            if self.threshold is not None or self.upper is not None:
                raise ValueError("An empty-value rule does not use thresholds.")
            return self
        pattern = r"[+-]?(?:\d{1,38}(?:\.\d{1,38})?|\.\d{1,38})"
        if self.threshold is None or not re.fullmatch(pattern, self.threshold):
            raise ValueError("Enter conditional-format thresholds as plain decimal numbers.")
        if self.operator == "between":
            if self.upper is None or not re.fullmatch(pattern, self.upper):
                raise ValueError("Enter both inclusive interval bounds.")
            if Decimal(self.threshold) > Decimal(self.upper):
                raise ValueError("The conditional interval upper bound must not be smaller.")
        elif self.upper is not None:
            raise ValueError("Only an interval rule uses an upper bound.")
        return self


class AnalyticalTableSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["analytical_table"] = "analytical_table"
    rows: AnalyticalRowRoles
    dimensions: list[str] = Field(max_length=8)
    measures: list[str] = Field(min_length=1, max_length=16)
    visible_measures: list[str] | None = Field(default=None, min_length=1, max_length=16)
    pinned_columns: int = Field(default=0, ge=0, le=4, strict=True)
    density: Literal["normal", "compact"] = "normal"
    rules: list[TableFormatRule] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def distinct_bindings(self) -> "AnalyticalTableSpec":
        ids = [*self.rows.model_dump().values(), *self.dimensions, *self.measures]
        if any(not identity for identity in ids) or len(ids) != len(set(ids)):
            raise ValueError("Analytical-table roles must reference distinct fields.")
        visible = self.visible_measures if self.visible_measures is not None else self.measures
        if len(visible) != len(set(visible)) or not set(visible) <= set(self.measures):
            raise ValueError("Choose distinct available analytical-table measures.")
        if self.pinned_columns > len(self.dimensions) + len(visible):
            raise ValueError("Cannot pin more analytical-table columns than are visible.")
        if len({rule.id for rule in self.rules}) != len(self.rules):
            raise ValueError("Conditional-format rule identities must be unique.")
        if any(rule.column_id not in self.measures for rule in self.rules):
            raise ValueError("Conditional formatting requires an analytical-table measure.")
        return self


class HierarchySpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["treemap_chart", "sunburst_chart"]
    rows: AnalyticalRowRoles
    dimensions: list[str] = Field(min_length=1, max_length=8)
    value_column_id: str = Field(min_length=1)


VisualizationSpec = (
    BubbleSpec
    | BoxPlotSpec
    | HistogramSpec
    | HeatmapSpec
    | RadarSpec
    | WaterfallSpec
    | ComboSpec
    | AnalyticalTableSpec
    | ParetoSpec
    | HierarchySpec
    | BulletSpec
    | FunnelSpec
)


def waterfall_spec(node_id: UUID) -> WaterfallSpec:
    return WaterfallSpec(
        steps=WaterfallRoles.model_validate(
            {name: f"water_{node_id.hex}_{name}" for name in WaterfallRoles.model_fields}
        )
    )


def heatmap_spec(node_id: UUID) -> HeatmapSpec:
    return HeatmapSpec(
        cells=HeatmapRoles.model_validate(
            {name: f"heat_{node_id.hex}_{name}" for name in HeatmapRoles.model_fields}
        )
    )


def histogram_spec(node_id: UUID) -> HistogramSpec:
    prefix = f"hist_{node_id.hex}_"
    return HistogramSpec(
        bins=HistogramRoles.model_validate(
            {name: prefix + name for name in HistogramRoles.model_fields}
        ),
        summary=HistogramSummaryRoles.model_validate(
            {name: prefix + name for name in HistogramSummaryRoles.model_fields}
        ),
    )


def box_plot_spec(node_id: UUID) -> BoxPlotSpec:
    """Bindings of boxplot_stats@1; identity is independent of display labels."""
    prefix = f"box_{node_id.hex}_"
    return BoxPlotSpec(
        summary=BoxSummaryRoles.model_validate(
            {name: prefix + name for name in BoxSummaryRoles.model_fields}
        ),
        outliers=BoxOutlierRoles.model_validate(
            {name: prefix + name for name in BoxOutlierRoles.model_fields}
        ),
    )


class VisualizationTypeDefinition(BaseModel):
    type: Literal[
        "bar_chart",
        "line_chart",
        "area_chart",
        "pie_chart",
        "donut_chart",
        "scatter_chart",
        "kpi",
        "table",
        "box_plot",
        "histogram_chart",
        "heatmap_chart",
        "radar_chart",
        "waterfall_chart",
        "combo_chart",
        "bubble_chart",
        "pareto_chart",
        "treemap_chart",
        "sunburst_chart",
        "bullet_chart",
        "funnel_chart",
        "analytical_table",
    ] = "box_plot"
    spec_version: Literal[1] = 1
    binding_contract: Literal["spec", "spec_or_legacy_config"] = "spec"
    result_data: Literal["datasets", "rows"] = "datasets"
    input_kinds: tuple[Literal["dataset", "scalar"], ...] = ("dataset",)
    name: str = "Box plot"
    purpose: str = "Compare distributions, quartiles and outliers across groups."
    preparation_node: (
        Literal[
            "boxplot_stats",
            "histogram",
            "heatmap_stats",
            "waterfall_steps",
            "table_rollup",
            "pareto",
            "funnel_steps",
        ]
        | None
    ) = "boxplot_stats"
    preparation_version: Literal[1] = 1
    publication_port: Literal["dataset"] | None = "dataset"
    datasets: dict[str, str] = Field(
        default_factory=lambda: {
            "summary": "dataset",
            "outliers": "outliers",
        }
    )
    max_groups: int | None = Field(default=2000, exclude_if=lambda value: value is None)
    quantile_method: Literal["linear"] | None = Field(
        default="linear", exclude_if=lambda value: value is None
    )
    whisker_iqr_multiplier: Literal["1.5"] | None = Field(
        default="1.5", exclude_if=lambda value: value is None
    )
    max_bins: int | None = Field(default=None, exclude_if=lambda value: value is None)
    max_axis_categories: int | None = Field(default=None, exclude_if=lambda value: value is None)
    max_cells: int | None = Field(default=None, exclude_if=lambda value: value is None)
    min_axes: int | None = Field(default=None, exclude_if=lambda value: value is None)
    max_axes: int | None = Field(default=None, exclude_if=lambda value: value is None)
    max_steps: int | None = Field(default=None, exclude_if=lambda value: value is None)
    max_series: int | None = Field(default=None, exclude_if=lambda value: value is None)
    max_nodes: int | None = Field(default=None, exclude_if=lambda value: value is None)


def visualization_types() -> list[VisualizationTypeDefinition]:
    """All chart families; basic types expose read specs and retain their saved bindings."""
    return [
        VisualizationTypeDefinition(),
        VisualizationTypeDefinition(
            type="funnel_chart",
            name="Funnel",
            purpose="Compare ordered prepared stages and their retention.",
            preparation_node="funnel_steps",
            datasets={"observations": "dataset", "summary": "summary"},
            max_steps=50,
            max_groups=None,
            quantile_method=None,
            whisker_iqr_multiplier=None,
        ),
        VisualizationTypeDefinition(
            type="bullet_chart",
            name="Bullet chart",
            purpose="Compare prepared actual and target against explicitly named ranges.",
            preparation_node=None,
            datasets={"observations": "dataset"},
            max_groups=None,
            quantile_method=None,
            whisker_iqr_multiplier=None,
        ),
        *[
            VisualizationTypeDefinition(
                type=kind,
                name=name,
                purpose="Compare additive contributions across a prepared hierarchy.",
                preparation_node="table_rollup",
                datasets={"hierarchy": "dataset"},
                max_groups=None,
                max_nodes=5000,
                quantile_method=None,
                whisker_iqr_multiplier=None,
            )
            for kind, name in (("treemap_chart", "Treemap"), ("sunburst_chart", "Sunburst"))
        ],
        VisualizationTypeDefinition(
            type="pareto_chart",
            name="Pareto chart",
            purpose="Compare ranked contributions and full-population cumulative share.",
            preparation_node="pareto",
            datasets={"observations": "dataset", "summary": "summary"},
            max_groups=None,
            quantile_method=None,
            whisker_iqr_multiplier=None,
        ),
        VisualizationTypeDefinition(
            type="bubble_chart",
            name="Bubble chart",
            purpose="Compare numeric X/Y measures and non-negative area on prepared unique rows.",
            preparation_node=None,
            datasets={"observations": "dataset"},
            max_groups=None,
            quantile_method=None,
            whisker_iqr_multiplier=None,
        ),
        VisualizationTypeDefinition(
            type="analytical_table",
            name="Analytical table",
            purpose="Inspect hierarchical totals with pinned columns and exact threshold rules.",
            preparation_node="table_rollup",
            datasets={"table": "dataset"},
            max_groups=20000,
            quantile_method=None,
            whisker_iqr_multiplier=None,
        ),
        VisualizationTypeDefinition(
            type="combo_chart",
            name="Combination chart",
            purpose="Compare prepared bars and lines with an explicitly enabled second axis.",
            preparation_node=None,
            datasets={"observations": "dataset"},
            max_groups=2000,
            max_series=8,
            quantile_method=None,
            whisker_iqr_multiplier=None,
        ),
        VisualizationTypeDefinition(
            type="waterfall_chart",
            name="Waterfall",
            purpose="Explain signed contributions and explicit subtotals/final balances.",
            preparation_node="waterfall_steps",
            datasets={"steps": "dataset"},
            max_groups=None,
            quantile_method=None,
            whisker_iqr_multiplier=None,
            max_steps=2000,
        ),
        VisualizationTypeDefinition(
            type="radar_chart",
            name="Radar",
            purpose="Compare prepared profiles on 3–8 explicitly scaled axes.",
            preparation_node=None,
            datasets={"profiles": "dataset"},
            max_groups=20,
            quantile_method=None,
            whisker_iqr_multiplier=None,
            min_axes=3,
            max_axes=8,
        ),
        VisualizationTypeDefinition(
            type="heatmap_chart",
            name="Heatmap",
            purpose="Compare an explicitly aggregated measure across two dimensions.",
            preparation_node="heatmap_stats",
            datasets={"cells": "dataset"},
            max_groups=None,
            quantile_method=None,
            whisker_iqr_multiplier=None,
            max_axis_categories=200,
            max_cells=10000,
        ),
        VisualizationTypeDefinition(
            type="histogram_chart",
            name="Histogram",
            purpose="Show observation counts in equal-width intervals.",
            preparation_node="histogram",
            datasets={"bins": "dataset", "summary": "summary"},
            max_groups=None,
            quantile_method=None,
            whisker_iqr_multiplier=None,
            max_bins=200,
        ),
        *[
            VisualizationTypeDefinition.model_validate(
                {
                    "type": kind,
                    "name": name,
                    "purpose": purpose,
                    "binding_contract": "spec_or_legacy_config",
                    "result_data": "rows",
                    "input_kinds": ["dataset", "scalar"] if kind == "kpi" else ["dataset"],
                    "preparation_node": None,
                    "publication_port": None,
                    "datasets": {},
                    "max_groups": None if kind == "table" else 1 if kind == "kpi" else 2000,
                    "max_series": 8
                    if kind in {"bar_chart", "line_chart"}
                    else 1
                    if kind != "table"
                    else None,
                    "quantile_method": None,
                    "whisker_iqr_multiplier": None,
                }
            )
            for kind, name, purpose in (
                (
                    "bar_chart",
                    "Bar chart",
                    "Compare prepared category values; aggregation belongs upstream.",
                ),
                (
                    "line_chart",
                    "Line chart",
                    "Show ordered prepared series; missing observations remain gaps.",
                ),
                ("area_chart", "Area chart", "Show one prepared series with a filled baseline."),
                ("pie_chart", "Pie chart", "Compare non-negative parts with a positive total."),
                ("donut_chart", "Donut chart", "Compare non-negative parts with a positive total."),
                (
                    "scatter_chart",
                    "Scatter chart",
                    "Compare numeric X and Y observations without implicit grouping.",
                ),
                ("kpi", "KPI", "Display one prepared value; no implicit sum or average."),
                (
                    "table",
                    "Table",
                    "Inspect ordered prepared fields with pagination and exact values.",
                ),
            )
        ],
    ]
