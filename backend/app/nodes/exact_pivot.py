"""Exact full-population pivot aggregation with unchanged dynamic field identities."""

from dataclasses import replace
from decimal import Decimal
from fractions import Fraction
from typing import cast

import polars as pl
from pydantic import ConfigDict, Field

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.exact_formulas import round_exact
from app.domain.formulas import FormulaValidationError
from app.domain.nodes import ExecutionContext, NodeDefinition, ValidationIssue, ValidationResult
from app.domain.workflows import NodeInstance
from app.nodes.combine import check_size
from app.nodes.common import input_schema
from app.nodes.pivot import PivotConfig, PivotExecutor, pivot_definition, pivot_field_identity


class ExactPivotConfig(PivotConfig):
    model_config = ConfigDict(extra="forbid")
    average_scale: int = Field(default=6, ge=0, le=38, strict=True)


def fields(
    config: ExactPivotConfig, schema: DatasetSchema
) -> tuple[ColumnSchema, ColumnSchema, ColumnSchema, int]:
    index = schema.by_id(config.index_column_id)
    pivot = schema.by_id(config.pivot_column_id)
    value = schema.by_id(config.value_column_id)
    if index.column_id == pivot.column_id:
        raise ValueError("Index and pivot fields must be different.")
    if config.operation != "count" and value.logical_type not in {
        LogicalType.INTEGER,
        LogicalType.DECIMAL,
        LogicalType.UNKNOWN,
    }:
        raise ValueError("Exact Pivot requires decimal or integer values, except for counting.")
    scale = value.metadata.get("scale") if value.logical_type == LogicalType.DECIMAL else 0
    if config.operation != "count" and (type(scale) is not int or not 0 <= scale <= 38):
        raise ValueError("Exact Pivot requires an explicit decimal scale from 0 to 38.")
    return index, pivot, value, cast(int, scale) if config.operation != "count" else 0


class ExactPivotExecutor(PivotExecutor):
    def validate(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> ValidationResult:
        try:
            fields(ExactPivotConfig.model_validate(node.config), input_schema(input_schemas))
        except (ValueError, StopIteration) as exc:
            return ValidationResult(
                (
                    ValidationIssue(
                        "INVALID_PIVOT", str(exc) or "Selected field is missing.", "config"
                    ),
                )
            )
        return ValidationResult()

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        config = ExactPivotConfig.model_validate(node.config)
        index, pivot, value, source_scale = fields(config, source.schema)
        scale = config.average_scale if config.operation == "average" else source_scale
        frame = source.frame.select(
            pl.col(index.engine_name).alias("index"),
            pl.col(pivot.engine_name).alias("category"),
            pl.col(value.engine_name).alias("value"),
        )
        rows = frame.select("index").unique(maintain_order=True).with_row_index("row")
        categories = frame.select("category").unique(maintain_order=True).with_row_index("column")
        if categories.height > 128:
            raise NodeExecutionError(
                "Pivot exceeds 128 distinct values. Filter the pivot field upstream."
            )
        check_size(rows.height, categories.height + 1)
        columns = [index]
        names = {index.engine_name}
        for category in categories["category"]:
            identity, name, label = pivot_field_identity(node, pivot, category, names)
            metadata = {
                **({} if config.operation == "count" else value.metadata),
                "source_columns": [value.column_id],
                "pivot_column_id": pivot.column_id,
                "pivot_value": label,
                "operation": config.operation,
            }
            if config.operation != "count":
                metadata.update(precision=38, scale=scale)
                if config.operation == "average":
                    metadata["rounding"] = "half_even"
            columns.append(
                ColumnSchema(
                    identity,
                    name,
                    name,
                    LogicalType.INTEGER if config.operation == "count" else LogicalType.DECIMAL,
                    config.operation != "count",
                    metadata,
                )
            )
        values: list[list[Decimal | int | None]] = [
            [0 if config.operation == "count" else None] * rows.height for _ in columns[1:]
        ]
        grouped = (
            frame.join(rows, on="index", how="left", nulls_equal=True)
            .join(categories, on="category", how="left", nulls_equal=True)
            .group_by("row", "column")
            .agg(pl.col("value"))
        )
        try:
            for row, column, observations in grouped.iter_rows():
                present = [item for item in observations if item is not None]
                if config.operation == "count":
                    values[column][row] = len(present)
                    continue
                numbers: list[Fraction] = []
                for item in present:
                    if type(item) is not int and not isinstance(item, Decimal):
                        raise NodeExecutionError(
                            "Exact Pivot input does not match its numeric schema."
                        )
                    number = Fraction(item)
                    if (number * 10**source_scale).denominator != 1:
                        raise NodeExecutionError(
                            "Exact Pivot input does not match its decimal scale."
                        )
                    numbers.append(number)
                result: Fraction | None = None
                if numbers:
                    if config.operation in {"sum", "average"}:
                        result = sum(numbers, Fraction(0))
                        if config.operation == "average":
                            result /= len(numbers)
                    else:
                        result = min(numbers) if config.operation == "min" else max(numbers)
                values[column][row] = round_exact(result, 38, scale)
            output = pl.DataFrame(
                [
                    rows["index"].rename(index.engine_name),
                    *(
                        pl.Series(
                            field.engine_name,
                            items,
                            dtype=pl.Int64
                            if config.operation == "count"
                            else pl.Decimal(38, scale),
                        )
                        for field, items in zip(columns[1:], values, strict=True)
                    ),
                ]
            )
        except (FormulaValidationError, ArithmeticError, pl.exceptions.PolarsError) as exc:
            raise NodeExecutionError(
                "Exact Pivot exceeds decimal precision or has invalid input. "
                "Reduce scale explicitly."
            ) from exc
        return Dataset(
            output, DatasetSchema(tuple(columns)), {**source.metadata, "exact_transport": True}
        )


def exact_pivot_definition() -> NodeDefinition:
    return replace(
        pivot_definition(),
        version=2,
        display_name="Exact Pivot",
        description="Exact pivot totals, averages and extrema with explicit average rounding.",
        config_schema=ExactPivotConfig,
        executor=ExactPivotExecutor(),
    )
