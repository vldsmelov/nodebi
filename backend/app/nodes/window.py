from typing import Literal

import polars as pl
from pydantic import BaseModel, Field

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.combine import check_size
from app.nodes.common import UnaryExecutor, input_schema, unary_definition
from app.nodes.sort import SortKey


class WindowConfig(BaseModel):
    partitions: list[str] = Field(default_factory=list)
    operation: Literal["sum", "row_number"]
    column_id: str | None = None
    order_by: list[SortKey] = Field(default_factory=list)
    name: str = Field(min_length=1, max_length=255)


class WindowExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        source = input_schema(input_schemas)
        config = WindowConfig.model_validate(node.config)
        if not config.name.strip():
            raise ValueError("Output field name must not be blank.")
        if len(set(config.partitions)) != len(config.partitions):
            raise ValueError("Partition fields must be unique.")
        for key in config.partitions + [key.column_id for key in config.order_by]:
            source.by_id(key)
        if config.operation == "sum":
            if not config.column_id or source.by_id(config.column_id).logical_type not in {
                LogicalType.INTEGER,
                LogicalType.FLOAT,
                LogicalType.UNKNOWN,
            }:
                raise ValueError("Window sum requires a numeric field.")
        elif not config.order_by:
            raise ValueError("Row numbering requires an explicit sort order.")
        return DatasetSchema(
            (
                *source.columns,
                ColumnSchema(
                    f"window_{node.id.hex}",
                    config.name,
                    config.name,
                    LogicalType.FLOAT if config.operation == "sum" else LogicalType.INTEGER,
                    config.operation == "sum",
                    {"source_columns": [config.column_id] if config.column_id else []},
                ),
            )
        )

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        config = WindowConfig.model_validate(node.config)
        schema = self.infer_schema(node, {"input": source.schema}, context)
        check_size(source.row_count, len(schema.columns))
        partitions = [source.schema.by_id(key).engine_name for key in config.partitions]
        frame = source.frame
        if config.operation == "sum":
            column = pl.col(source.schema.by_id(config.column_id or "").engine_name).cast(
                pl.Float64
            )
            expression = pl.when(column.count() > 0).then(column.sum()).otherwise(None)
        else:
            frame = frame.sort(
                [source.schema.by_id(key.column_id).engine_name for key in config.order_by],
                descending=[key.direction == "descending" for key in config.order_by],
                nulls_last=True,
                maintain_order=True,
            )
            expression = pl.int_range(1, pl.len() + 1, dtype=pl.Int64)
        if partitions:
            expression = expression.over(partitions)
        frame = frame.with_columns(expression.alias(config.name))
        if (
            config.operation == "sum"
            and frame.select((~pl.col(config.name).is_finite()).any()).item()
        ):
            raise NodeExecutionError("Window sum produced a non-finite number.")
        return Dataset(frame, schema, source.metadata)


def window_definition() -> NodeDefinition:
    return unary_definition(
        "window",
        "Window",
        "Partition totals and ordered row numbers.",
        WindowConfig,
        WindowExecutor(),
    )
