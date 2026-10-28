import hashlib
import json
from dataclasses import replace
from typing import Literal

import polars as pl
from pydantic import BaseModel, Field

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import (
    ExecutionContext,
    NodeDefinition,
    SchemaInferenceMode,
    ValidationIssue,
    ValidationResult,
)
from app.domain.workflows import NodeInstance
from app.nodes.combine import check_size
from app.nodes.common import UnaryExecutor, input_schema, unary_definition


class PivotConfig(BaseModel):
    index_column_id: str = Field(min_length=1)
    pivot_column_id: str = Field(min_length=1)
    value_column_id: str = Field(min_length=1)
    operation: Literal["count", "sum", "average", "min", "max"] = "sum"


def pivot_field_identity(
    node: NodeInstance, pivot: ColumnSchema, category: object, names: set[str]
) -> tuple[str, str, str]:
    """Shared dynamic identities/labels; aggregate versions own their numeric contracts."""
    label = "(empty)" if category is None else str(category)
    base = f"pivot_{label}"
    name = base
    suffix = 1
    while name in names:
        suffix += 1
        name = f"{base}__{suffix}"
    names.add(name)
    identity = hashlib.sha256(
        json.dumps([pivot.logical_type.value, category], default=str, ensure_ascii=False).encode()
    ).hexdigest()[:20]
    return f"pivot_{node.id.hex}_{identity}", name, label


def validate_config(config: PivotConfig, schema: DatasetSchema) -> None:
    schema.by_id(config.index_column_id)
    schema.by_id(config.pivot_column_id)
    value = schema.by_id(config.value_column_id)
    if config.index_column_id == config.pivot_column_id:
        raise ValueError("Index and pivot fields must be different.")
    if config.operation in {"sum", "average"} and value.logical_type not in {
        LogicalType.INTEGER,
        LogicalType.FLOAT,
        LogicalType.UNKNOWN,
    }:
        raise ValueError("Sum and average require a numeric value field.")


class PivotExecutor(UnaryExecutor):
    def validate(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> ValidationResult:
        try:
            validate_config(PivotConfig.model_validate(node.config), input_schema(input_schemas))
        except (ValueError, StopIteration) as exc:
            return ValidationResult(
                (
                    ValidationIssue(
                        "INVALID_PIVOT", str(exc) or "Selected field is missing.", "config"
                    ),
                )
            )
        return ValidationResult()

    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        raise ValueError(
            "Pivot output fields depend on the input values; execute the node to resolve them."
        )

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        config = PivotConfig.model_validate(node.config)
        validate_config(config, source.schema)
        index = source.schema.by_id(config.index_column_id)
        pivot = source.schema.by_id(config.pivot_column_id)
        value = source.schema.by_id(config.value_column_id)
        categories = source.frame[pivot.engine_name].unique(maintain_order=True).to_list()
        if len(categories) > 128:
            raise NodeExecutionError(
                "Pivot exceeds 128 distinct values. Filter the pivot field upstream."
            )
        groups = source.frame[index.engine_name].n_unique()
        check_size(groups, len(categories) + 1)
        columns = [index]
        expressions = []
        names = {index.engine_name}
        for category in categories:
            identity, name, label = pivot_field_identity(node, pivot, category, names)
            dtype = (
                LogicalType.INTEGER
                if config.operation == "count"
                else LogicalType.FLOAT
                if config.operation in {"sum", "average"}
                else value.logical_type
            )
            columns.append(
                ColumnSchema(
                    identity,
                    name,
                    name,
                    dtype,
                    config.operation != "count",
                    {
                        "source_columns": [value.column_id],
                        "pivot_column_id": pivot.column_id,
                        "pivot_value": label,
                        "operation": config.operation,
                    },
                )
            )
            condition = (
                pl.col(pivot.engine_name).is_null()
                if category is None
                else pl.col(pivot.engine_name).eq(pl.lit(category))
            )
            selected = pl.col(value.engine_name).filter(condition)
            if config.operation == "count":
                expression = selected.count().cast(pl.Int64)
            elif config.operation == "sum":
                expression = (
                    pl.when(selected.count() > 0)
                    .then(selected.cast(pl.Float64).sum())
                    .otherwise(None)
                )
            elif config.operation == "average":
                expression = selected.cast(pl.Float64).mean()
            elif config.operation == "min":
                expression = selected.min()
            else:
                expression = selected.max()
            expressions.append(expression.alias(name))
        frame = source.frame.group_by(index.engine_name, maintain_order=True).agg(expressions)
        for column in columns[1:]:
            if (
                column.logical_type == LogicalType.FLOAT
                and (~frame[column.engine_name].is_finite()).any()
            ):
                raise NodeExecutionError(
                    "Pivot produced a non-finite value. Check numeric overflow."
                )
        return Dataset(frame, DatasetSchema(tuple(columns)))


def pivot_definition() -> NodeDefinition:
    return replace(
        unary_definition(
            "pivot",
            "Pivot",
            "Turn distinct values into aggregate fields.",
            PivotConfig,
            PivotExecutor(),
        ),
        schema_inference_mode=SchemaInferenceMode.DATA_DEPENDENT,
    )
