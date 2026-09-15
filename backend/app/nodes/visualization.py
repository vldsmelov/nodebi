import polars as pl

from app.domain.datasets import Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
)
from app.domain.visualizations import CHART_NAMES, CHART_TYPES, VisualizationConfig
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema


class VisualizationExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schema(input_schemas)
        config = VisualizationConfig.model_validate(node.config)
        for column_id in config.column_formats:
            schema.by_id(column_id)
        if node.type == "table":
            ids = (
                config.column_ids
                if config.column_ids is not None
                else [c.column_id for c in schema.columns]
            )
            if schema.columns and not ids:
                raise ValueError("Select at least one table field.")
            return DatasetSchema(tuple(schema.by_id(identity) for identity in ids))
        if not config.value_column_id:
            raise ValueError("Select a numeric value field.")
        value = schema.by_id(config.value_column_id)
        if value.logical_type not in {
            LogicalType.INTEGER,
            LogicalType.FLOAT,
            LogicalType.UNKNOWN,
        } and not (node.type == "kpi" and value.logical_type == LogicalType.STRING):
            raise ValueError("Select a numeric value field.")
        if node.type != "kpi":
            if not config.category_column_id:
                raise ValueError("Select a category field.")
            category = schema.by_id(config.category_column_id)
            if node.type == "scatter_chart" and category.logical_type not in {
                LogicalType.INTEGER,
                LogicalType.FLOAT,
                LogicalType.UNKNOWN,
            }:
                raise ValueError("Scatter X field must be numeric.")
        return schema

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        if node.type == "table":
            return Dataset(source.frame.select([c.engine_name for c in schema.columns]), schema)
        config = VisualizationConfig.model_validate(node.config)
        assert config.value_column_id is not None
        value_name = source.schema.by_id(config.value_column_id).engine_name
        if (
            source.schema.by_id(config.value_column_id).logical_type != LogicalType.STRING
            and (~source.frame[value_name].cast(pl.Float64).is_finite()).any()
        ):
            raise NodeExecutionError("Visualization values must be finite numbers or empty.")
        if node.type == "scatter_chart":
            assert config.category_column_id is not None
            x_name = source.schema.by_id(config.category_column_id).engine_name
            if (~source.frame[x_name].cast(pl.Float64).is_finite()).any():
                raise NodeExecutionError("Scatter X values must be finite numbers or empty.")
        if node.type == "kpi" and source.row_count != 1:
            raise NodeExecutionError(
                "KPI requires exactly one row. Add a Group By with no dimensions first."
            )
        if node.type != "kpi" and source.row_count > 2000:
            raise NodeExecutionError(
                "Chart exceeds 2000 points. Aggregate or explicitly filter the upstream data."
            )
        if node.type in {"pie_chart", "donut_chart"} and source.row_count:
            values = source.frame[value_name].cast(pl.Float64)
            if (values < 0).any() or not (values.sum() or 0) > 0:
                raise NodeExecutionError(
                    "Pie and donut require non-negative values with a positive total."
                )
        return source


def visualization_definitions() -> tuple[NodeDefinition, ...]:
    return tuple(
        NodeDefinition(
            type=kind,
            version=1,
            category=NodeCategory.VISUALIZATION,
            display_name=CHART_NAMES[kind],
            description="Display prepared data. Configure aggregation upstream.",
            input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
            output_ports=(),
            config_schema=VisualizationConfig,
            schema_inference_mode=SchemaInferenceMode.STATIC,
            executor=VisualizationExecutor(),
        )
        for kind in CHART_TYPES
    )
