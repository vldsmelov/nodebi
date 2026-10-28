from dataclasses import replace
from functools import lru_cache

from app.domain.nodes import NodeRegistry
from app.nodes.align_measures import align_measures_definition
from app.nodes.bound_visualization import bound_visualization_definitions
from app.nodes.boxplot_stats import boxplot_stats_definition
from app.nodes.calculated_column import calculated_column_definition
from app.nodes.calendar import calendar_definition
from app.nodes.combine import combine_definitions
from app.nodes.convert_types import convert_types_definition
from app.nodes.dataset_source import dataset_source_definition
from app.nodes.exact_calculated_column import exact_calculated_column_definition
from app.nodes.exact_field_formula import exact_field_formula_definition
from app.nodes.exact_field_operations import exact_field_definitions
from app.nodes.exact_group_by import exact_group_by_definition
from app.nodes.exact_pivot import exact_pivot_definition
from app.nodes.exact_window import exact_window_definition
from app.nodes.excel_source import excel_source_definition
from app.nodes.field_operations import field_definitions
from app.nodes.filter import filter_definition
from app.nodes.funnel import funnel_definition
from app.nodes.group_by import group_by_definition
from app.nodes.heatmap import heatmap_definition
from app.nodes.histogram import histogram_definition
from app.nodes.limit import limit_definition
from app.nodes.pareto import pareto_definition
from app.nodes.period_comparison import period_definitions
from app.nodes.pivot import pivot_definition
from app.nodes.rename_columns import rename_columns_definition
from app.nodes.select_columns import select_columns_definition
from app.nodes.sort import sort_definition
from app.nodes.stable_group_by import stable_group_by_definition
from app.nodes.table_rollup import table_rollup_definition
from app.nodes.unpivot import unpivot_definition
from app.nodes.visualization import visualization_definitions
from app.nodes.waterfall import waterfall_definition
from app.nodes.window import ordered_window_definition, window_definition


@lru_cache
def get_node_registry() -> NodeRegistry:
    from app.nodes.context_filter import context_filter_definition

    registry = NodeRegistry()
    registry.register(exact_field_formula_definition())
    registry.register(exact_pivot_definition())
    registry.register(pareto_definition())
    registry.register(funnel_definition())
    registry.register(table_rollup_definition())
    registry.register(waterfall_definition())
    registry.register(histogram_definition())
    registry.register(heatmap_definition())
    registry.register(boxplot_stats_definition())
    registry.register(align_measures_definition())
    registry.register(context_filter_definition())
    for definition in field_definitions():
        registry.register(definition)
    for definition in exact_field_definitions():
        registry.register(definition)
    registry.register(window_definition())
    registry.register(ordered_window_definition())
    registry.register(exact_window_definition())
    registry.register(calendar_definition())
    for definition in period_definitions():
        registry.register(definition)
    registry.register(unpivot_definition())
    registry.register(convert_types_definition())
    registry.register(excel_source_definition())
    registry.register(dataset_source_definition())
    registry.register(
        replace(
            excel_source_definition(),
            type="excel_periods",
            display_name="Excel by period",
            description="Append explicitly selected workbook periods with Union semantics.",
        )
    )
    registry.register(filter_definition())
    registry.register(rename_columns_definition())
    registry.register(select_columns_definition())
    registry.register(sort_definition())
    registry.register(limit_definition())
    registry.register(calculated_column_definition())
    registry.register(exact_calculated_column_definition())
    registry.register(group_by_definition())
    registry.register(exact_group_by_definition())
    registry.register(stable_group_by_definition())
    for definition in combine_definitions():
        registry.register(definition)
    registry.register(pivot_definition())
    for definition in visualization_definitions():
        registry.register(definition)
    for definition in bound_visualization_definitions():
        registry.register(definition)
    return registry
