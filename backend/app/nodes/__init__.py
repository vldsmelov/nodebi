from functools import lru_cache

from app.domain.nodes import NodeRegistry
from app.nodes.bound_visualization import bound_visualization_definitions
from app.nodes.calculated_column import calculated_column_definition
from app.nodes.combine import combine_definitions
from app.nodes.convert_types import convert_types_definition
from app.nodes.excel_source import excel_source_definition
from app.nodes.field_operations import field_definitions
from app.nodes.filter import filter_definition
from app.nodes.group_by import group_by_definition
from app.nodes.limit import limit_definition
from app.nodes.pivot import pivot_definition
from app.nodes.rename_columns import rename_columns_definition
from app.nodes.select_columns import select_columns_definition
from app.nodes.sort import sort_definition
from app.nodes.unpivot import unpivot_definition
from app.nodes.visualization import visualization_definitions
from app.nodes.window import window_definition


@lru_cache
def get_node_registry() -> NodeRegistry:
    registry = NodeRegistry()
    for definition in field_definitions():
        registry.register(definition)
    registry.register(window_definition())
    registry.register(unpivot_definition())
    registry.register(convert_types_definition())
    registry.register(excel_source_definition())
    registry.register(filter_definition())
    registry.register(rename_columns_definition())
    registry.register(select_columns_definition())
    registry.register(sort_definition())
    registry.register(limit_definition())
    registry.register(calculated_column_definition())
    registry.register(group_by_definition())
    for definition in combine_definitions():
        registry.register(definition)
    registry.register(pivot_definition())
    for definition in visualization_definitions():
        registry.register(definition)
    for definition in bound_visualization_definitions():
        registry.register(definition)
    return registry
