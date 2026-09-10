from typing import Literal

import polars as pl
from pydantic import BaseModel, Field

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
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema

CHART_TYPES = ("bar_chart", "kpi")


class VisualizationConfig(BaseModel):
    title: str = Field(default="", max_length=200)
    value_column_id: str = Field(min_length=1)
    category_column_id: str | None = None
    number_format: Literal["number", "currency", "percent"] = "number"
    decimals: int = Field(default=2, ge=0, le=8)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")


class VisualizationExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schema(input_schemas)
        config = VisualizationConfig.model_validate(node.config)
        value = schema.by_id(config.value_column_id)
        if value.logical_type not in {LogicalType.INTEGER, LogicalType.FLOAT, LogicalType.UNKNOWN}:
            raise ValueError("Select a numeric value field.")
        if node.type == "bar_chart":
            if not config.category_column_id:
                raise ValueError("Select a category field.")
            schema.by_id(config.category_column_id)
        return schema

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        self.infer_schema(node, {"input": source.schema}, context)
        config = VisualizationConfig.model_validate(node.config)
        value_name = source.schema.by_id(config.value_column_id).engine_name
        if (~source.frame[value_name].cast(pl.Float64).is_finite()).any():
            raise NodeExecutionError("Visualization values must be finite numbers or empty.")
        if node.type == "kpi" and source.row_count != 1:
            raise NodeExecutionError(
                "KPI requires exactly one row. Add a Group By with no dimensions first."
            )
        if node.type == "bar_chart" and source.row_count > 2000:
            raise NodeExecutionError(
                "Chart exceeds 2000 points. Aggregate or explicitly filter the upstream data."
            )
        return source


def visualization_definitions() -> tuple[NodeDefinition, ...]:
    return tuple(
        NodeDefinition(
            type=kind,
            version=1,
            category=NodeCategory.VISUALIZATION,
            display_name="Bar Chart" if kind == "bar_chart" else "KPI",
            description="Display prepared data. Configure aggregation upstream.",
            input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
            output_ports=(),
            config_schema=VisualizationConfig,
            schema_inference_mode=SchemaInferenceMode.STATIC,
            executor=VisualizationExecutor(),
        )
        for kind in CHART_TYPES
    )
