from dataclasses import replace
from typing import Literal

import polars as pl
from pydantic import BaseModel, Field

from app.domain.datasets import Dataset, DatasetSchema, LogicalType, logical_to_polars
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema, unary_definition


class Conversion(BaseModel):
    column_id: str
    target: Literal["string", "integer", "float", "boolean", "date", "datetime"]
    on_error: Literal["error", "null"] = "error"


class ConvertTypesConfig(BaseModel):
    conversions: list[Conversion] = Field(min_length=1, max_length=1024)


def conversion_expression(name: str, rule: Conversion, source: LogicalType) -> pl.Expr:
    column = pl.col(name)
    if source == LogicalType.STRING:
        if rule.target == "date":
            return column.str.to_date("%Y-%m-%d", strict=False)
        if rule.target == "datetime":
            return column.str.to_datetime("%Y-%m-%dT%H:%M:%S", strict=False)
        if rule.target == "boolean":
            return column.replace_strict({"true": True, "false": False}, default=None)
    expression = column.cast(logical_to_polars(LogicalType(rule.target)), strict=False)
    if rule.target == "integer" and source in {LogicalType.FLOAT, LogicalType.DECIMAL}:
        expression = pl.when(column == column.floor()).then(expression).otherwise(None)
    if rule.target == "float":
        expression = pl.when(expression.is_finite()).then(expression).otherwise(None)
    return expression


class ConvertTypesExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        source = input_schema(input_schemas)
        config = ConvertTypesConfig.model_validate(node.config)
        rules = {rule.column_id: rule for rule in config.conversions}
        if len(rules) != len(config.conversions):
            raise ValueError("Conversion fields must be unique.")
        for key in rules:
            source.by_id(key)
        return DatasetSchema(
            tuple(
                replace(
                    column, logical_type=LogicalType(rules[column.column_id].target), nullable=True
                )
                if column.column_id in rules
                else column
                for column in source.columns
            )
        )

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        expressions = []
        for rule in ConvertTypesConfig.model_validate(node.config).conversions:
            column = source.schema.by_id(rule.column_id)
            expression = conversion_expression(column.engine_name, rule, column.logical_type)
            invalid = source.frame.select(
                (pl.col(column.engine_name).is_not_null() & expression.is_null()).alias("invalid")
            )["invalid"]
            if rule.on_error == "error" and invalid.any():
                offset = int(invalid.arg_true()[0])
                identity = next(
                    (
                        field
                        for field in source.schema.columns
                        if field.metadata.get("source_row_number")
                    ),
                    None,
                )
                row = source.frame[identity.engine_name][offset] if identity else offset + 1
                raise NodeExecutionError(
                    f"Cannot convert field {column.column_id} at row {row} to {rule.target}."
                )
            expressions.append(expression.alias(column.engine_name))
        return Dataset(source.frame.with_columns(expressions), schema, source.metadata)


def convert_types_definition() -> NodeDefinition:
    return unary_definition(
        "convert_types",
        "Convert Types",
        "Convert fields explicitly.",
        ConvertTypesConfig,
        ConvertTypesExecutor(),
    )
