from functools import lru_cache

from app.domain.nodes import NodeRegistry
from app.nodes.calculated_column import calculated_column_definition
from app.nodes.combine import combine_definitions
from app.nodes.excel_source import excel_source_definition
from app.nodes.filter import filter_definition
from app.nodes.group_by import group_by_definition
from app.nodes.limit import limit_definition
from app.nodes.pivot import pivot_definition
from app.nodes.rename_columns import rename_columns_definition
from app.nodes.select_columns import select_columns_definition
from app.nodes.sort import sort_definition
from app.nodes.visualization import visualization_definitions


@lru_cache
def get_node_registry() -> NodeRegistry:
    registry = NodeRegistry()
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
    return registry
