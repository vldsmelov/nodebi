from typing import Literal

import polars as pl
from pydantic import BaseModel, Field, field_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema, unary_definition


class Aggregation(BaseModel):
    column_id: str | None = None
    operation: Literal["count", "sum", "average", "min", "max", "distinct_count"]
    name: str = Field(min_length=1, max_length=255)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str) -> str:
        name = " ".join(name.split())
        if not name:
            raise ValueError("Aggregation name must not be blank.")
        return name


class GroupByConfig(BaseModel):
    dimensions: list[str] = Field(default_factory=list)
    aggregations: list[Aggregation] = Field(min_length=1, max_length=256)


class GroupByExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schema(input_schemas)
        config = GroupByConfig.model_validate(node.config)
        if len(set(config.dimensions)) != len(config.dimensions):
            raise ValueError("Group dimensions must be unique.")
        columns = [schema.by_id(key) for key in config.dimensions]
        for index, aggregation in enumerate(config.aggregations):
            field = schema.by_id(aggregation.column_id) if aggregation.column_id else None
            if field is None and aggregation.operation != "count":
                raise ValueError("Select a field for this aggregation.")
            if (
                aggregation.operation in {"sum", "average"}
                and field is not None
                and field.logical_type
                not in {
                    LogicalType.INTEGER,
                    LogicalType.FLOAT,
                    LogicalType.UNKNOWN,
                }
            ):
                raise ValueError("Sum and average require a numeric field.")
            dtype = (
                LogicalType.INTEGER
                if aggregation.operation in {"count", "distinct_count"}
                else LogicalType.FLOAT
                if aggregation.operation in {"sum", "average"}
                else field.logical_type
                if field
                else LogicalType.UNKNOWN
            )
            columns.append(
                ColumnSchema(
                    f"agg_{node.id.hex}_{index}",
                    aggregation.name,
                    aggregation.name,
                    dtype,
                    aggregation.operation not in {"count", "distinct_count"},
                    {
                        "source_columns": [field.column_id] if field else [],
                        "operation": aggregation.operation,
                    },
                )
            )
        return DatasetSchema(tuple(columns))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        config = GroupByConfig.model_validate(node.config)
        expressions: list[pl.Expr] = []
        for aggregation in config.aggregations:
            field = source.schema.by_id(aggregation.column_id) if aggregation.column_id else None
            column = pl.col(field.engine_name) if field else pl.lit(None)
            if aggregation.operation == "count":
                expression = column.count() if field else pl.len()
                expression = expression.cast(pl.Int64)
            elif aggregation.operation == "distinct_count":
                expression = column.drop_nulls().n_unique().cast(pl.Int64)
            elif aggregation.operation == "sum":
                expression = (
                    pl.when(column.count() > 0).then(column.cast(pl.Float64).sum()).otherwise(None)
                )
            elif aggregation.operation == "average":
                expression = column.cast(pl.Float64).mean()
            elif aggregation.operation == "min":
                expression = column.min()
            else:
                expression = column.max()
            expressions.append(expression.alias(aggregation.name))
        dimensions = [source.schema.by_id(key).engine_name for key in config.dimensions]
        frame = (
            source.frame.group_by(dimensions, maintain_order=True).agg(expressions)
            if dimensions
            else source.frame.select(expressions)
        )
        for output in schema.columns:
            if (
                output.logical_type == LogicalType.FLOAT
                and frame.select((~pl.col(output.engine_name).is_finite()).any()).item()
            ):
                raise NodeExecutionError(
                    "Aggregation produced a non-finite number. Check numeric overflow."
                )
        return Dataset(frame, schema, source.metadata)


def group_by_definition() -> NodeDefinition:
    return unary_definition(
        "group_by",
        "Group By",
        "Aggregate rows by dimensions, or calculate a global total.",
        GroupByConfig,
        GroupByExecutor(),
    )
