import json
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from enum import StrEnum
from functools import reduce
from typing import Any, Literal, cast

import polars as pl
from pydantic import BaseModel, Field

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
    ValidationIssue,
    ValidationResult,
)
from app.domain.parameters import ParameterDefinition, compatible_parameters
from app.domain.workflows import NodeInstance


class FilterOperator(StrEnum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    GREATER_OR_EQUAL = "greater_or_equal"
    LESS_THAN = "less_than"
    LESS_OR_EQUAL = "less_or_equal"
    CONTAINS = "contains"
    DOES_NOT_CONTAIN = "does_not_contain"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"


class FilterCondition(BaseModel):
    column_id: str = Field(min_length=1)
    operator: FilterOperator
    value: Any = None
    parameter: str | None = Field(default=None, min_length=1, max_length=64)


class FilterConfig(BaseModel):
    mode: Literal["and"] = "and"
    conditions: list[FilterCondition] = Field(min_length=1)


COMPARISON_OPERATORS = {
    FilterOperator.EQUALS,
    FilterOperator.NOT_EQUALS,
    FilterOperator.GREATER_THAN,
    FilterOperator.GREATER_OR_EQUAL,
    FilterOperator.LESS_THAN,
    FilterOperator.LESS_OR_EQUAL,
}
STRING_OPERATORS = {
    FilterOperator.EQUALS,
    FilterOperator.NOT_EQUALS,
    FilterOperator.CONTAINS,
    FilterOperator.DOES_NOT_CONTAIN,
    FilterOperator.STARTS_WITH,
    FilterOperator.ENDS_WITH,
}
NULL_OPERATORS = {FilterOperator.IS_NULL, FilterOperator.IS_NOT_NULL}


def allowed_operators(logical_type: LogicalType) -> set[FilterOperator]:
    if logical_type in {
        LogicalType.INTEGER,
        LogicalType.FLOAT,
        LogicalType.DECIMAL,
        LogicalType.DATE,
        LogicalType.DATETIME,
    }:
        return COMPARISON_OPERATORS | NULL_OPERATORS
    if logical_type == LogicalType.STRING:
        return STRING_OPERATORS | NULL_OPERATORS
    if logical_type == LogicalType.BOOLEAN:
        return {FilterOperator.EQUALS, FilterOperator.NOT_EQUALS} | NULL_OPERATORS
    return NULL_OPERATORS


class FilterExecutor:
    def _config(self, node: NodeInstance) -> FilterConfig:
        return FilterConfig.model_validate(node.config)

    def _resolve(
        self,
        node: NodeInstance,
        schema: DatasetSchema,
        context: ExecutionContext,
        *,
        executing: bool = False,
    ) -> tuple[tuple[FilterCondition, ColumnSchema, Any], ...]:
        columns = {column.column_id: column for column in schema.columns}
        resolved: list[tuple[FilterCondition, ColumnSchema, Any]] = []
        for condition in self._config(node).conditions:
            column = columns.get(condition.column_id)
            if column is None:
                raise ValueError(f"Filtered column no longer exists: {condition.column_id}.")
            if condition.operator not in allowed_operators(column.logical_type):
                raise ValueError(
                    f"Operator '{condition.operator}' is not valid for {column.logical_type}."
                )
            value = None
            if condition.parameter:
                if condition.value is not None or condition.operator in NULL_OPERATORS:
                    raise ValueError("Choose either a literal filter value or a parameter.")
                definition = next(
                    (
                        item
                        for item in context.parameter_definitions
                        if item.name == condition.parameter
                    ),
                    None,
                )
                if definition is None:
                    raise ValueError(f"Filter parameter '{condition.parameter}' is not declared.")
                if definition.logical_type != column.logical_type and not (
                    definition.logical_type == "integer"
                    and column.logical_type == LogicalType.FLOAT
                ):
                    raise ValueError(
                        f"Filter parameter '{condition.parameter}' has an incompatible type."
                    )
                if column.logical_type == LogicalType.DECIMAL and not compatible_parameters(
                    definition,
                    ParameterDefinition(
                        name="field",
                        logical_type="decimal",
                        precision=column.metadata.get("precision"),
                        scale=column.metadata.get("scale"),
                    ),
                ):
                    raise ValueError("Decimal filter parameter precision/scale must fit the field.")
                if executing:
                    value = definition.checked(
                        context.parameters.get(definition.name, definition.default)
                    )
                    if value is None:
                        raise NodeExecutionError(
                            f"Filter parameter '{condition.parameter}' is required."
                        )
                    value = self._coerce(value, column.logical_type)
                resolved.append((condition, column, value))
                continue
            if condition.operator not in NULL_OPERATORS:
                if condition.value is None or condition.value == "":
                    raise ValueError("Filter value is required for this operator.")
                value = self._coerce(condition.value, column.logical_type)
            resolved.append((condition, column, value))
        return tuple(resolved)

    def _coerce(self, value: Any, logical_type: LogicalType) -> Any:
        try:
            if isinstance(value, (dict, list, tuple, set)):
                raise ValueError
            if logical_type == LogicalType.INTEGER:
                if isinstance(value, bool):
                    raise ValueError
                if isinstance(value, float) and not value.is_integer():
                    raise ValueError
                return int(value)
            if logical_type == LogicalType.FLOAT:
                if isinstance(value, bool):
                    raise ValueError
                return float(value)
            if logical_type == LogicalType.DECIMAL:
                if isinstance(value, bool):
                    raise ValueError
                number = Decimal(str(value))
                if not number.is_finite():
                    raise ValueError
                return number
            if logical_type == LogicalType.BOOLEAN:
                if isinstance(value, bool):
                    return value
                normalized = str(value).strip().lower()
                if normalized in {"true", "1"}:
                    return True
                if normalized in {"false", "0"}:
                    return False
                raise ValueError
            if logical_type == LogicalType.DATE:
                return date.fromisoformat(str(value))
            if logical_type == LogicalType.DATETIME:
                return datetime.fromisoformat(str(value))
            return str(value)
        except (TypeError, ValueError, InvalidOperation) as exc:
            raise ValueError(f"Value '{value}' is invalid for {logical_type}.") from exc

    def validate(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> ValidationResult:
        schema = input_schemas.get("input")
        if schema is None:
            return ValidationResult(
                (ValidationIssue("MISSING_INPUT_SCHEMA", "Filter requires an input."),)
            )
        try:
            self._resolve(node, schema, context)
        except ValueError as exc:
            return ValidationResult((ValidationIssue("INVALID_FILTER", str(exc), "conditions"),))
        return ValidationResult()

    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schemas.get("input")
        if schema is None:
            raise ValueError("Filter requires an input schema.")
        self._resolve(node, schema, context)
        return schema

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs.get("input")
        if source is None:
            raise ValueError("Filter requires an input dataset.")
        expressions = [
            self._expression(*item)
            for item in self._resolve(node, source.schema, context, executing=True)
        ]
        predicate = reduce(lambda left, right: left & right, expressions)
        return Dataset(
            source.frame.filter(predicate),
            source.schema,
            {**source.metadata, "filter_condition_count": len(expressions)},
        )

    def _expression(self, condition: FilterCondition, column: ColumnSchema, value: Any) -> pl.Expr:
        expression = pl.col(column.engine_name)
        match condition.operator:
            case FilterOperator.EQUALS:
                return cast(pl.Expr, expression == value)
            case FilterOperator.NOT_EQUALS:
                return cast(pl.Expr, expression != value)
            case FilterOperator.GREATER_THAN:
                return cast(pl.Expr, expression > value)
            case FilterOperator.GREATER_OR_EQUAL:
                return cast(pl.Expr, expression >= value)
            case FilterOperator.LESS_THAN:
                return cast(pl.Expr, expression < value)
            case FilterOperator.LESS_OR_EQUAL:
                return cast(pl.Expr, expression <= value)
            case FilterOperator.CONTAINS:
                return expression.str.contains(str(value), literal=True)
            case FilterOperator.DOES_NOT_CONTAIN:
                return ~expression.str.contains(str(value), literal=True)
            case FilterOperator.STARTS_WITH:
                return expression.str.starts_with(str(value))
            case FilterOperator.ENDS_WITH:
                return expression.str.ends_with(str(value))
            case FilterOperator.IS_NULL:
                return expression.is_null()
            case FilterOperator.IS_NOT_NULL:
                return expression.is_not_null()


def filter_cache_identity(node: NodeInstance, context: ExecutionContext) -> str:
    used = {
        item.parameter
        for item in FilterConfig.model_validate(node.config).conditions
        if item.parameter
    }
    values = {}
    for definition in context.parameter_definitions:
        if definition.name in used:
            value = definition.checked(context.parameters.get(definition.name, definition.default))
            values[definition.name] = value
    return json.dumps(values, sort_keys=True, ensure_ascii=True, allow_nan=False)


def filter_definition() -> NodeDefinition:
    return NodeDefinition(
        type="filter",
        version=1,
        category=NodeCategory.TRANSFORM,
        display_name="Filter",
        description="Keep rows matching typed conditions.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(PortDefinition("dataset", "Dataset", PortKind.DATASET, False, None),),
        config_schema=FilterConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=FilterExecutor(),
        icon="list-filter",
        cache_identity=filter_cache_identity,
    )
