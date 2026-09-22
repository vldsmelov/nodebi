"""Typed execution values. Field wires compose expressions, never positional row joins.

The shared graph runner routes these values in v2 and adapts legacy Dataset
executors without changing their transformation contracts.
"""

import math
from dataclasses import dataclass, replace
from datetime import date, datetime
from typing import Literal
from uuid import UUID

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType, logical_to_polars
from app.domain.formulas import CompiledFormula, FormulaValidationError, compile_formula
from app.domain.parameters import ParameterDefinition, ParameterValue, resolve_parameters


class ValueConnectionError(ValueError):
    """An invalid typed connection or an unsafe result at a table boundary."""

    def __init__(self, message: str, *, field: str | None = None) -> None:
        super().__init__(message)
        self.field = field


@dataclass(frozen=True)
class RowContext:
    workflow_id: UUID
    node_id: UUID
    output_port: str


@dataclass(frozen=True)
class TableValue:
    context: RowContext
    dataset: Dataset


@dataclass(frozen=True)
class FieldValue:
    context: RowContext
    formula: CompiledFormula
    complexity: int = 1
    depth: int = 1
    checks: tuple[pl.Expr, ...] = ()


@dataclass(frozen=True)
class ScalarValue:
    value: str | int | float | bool | None
    logical_type: LogicalType | None = None

    def __post_init__(self) -> None:
        if type(self.value) not in (str, int, float, bool, type(None)):
            raise ValueConnectionError("Unsupported scalar type.")
        if self.logical_type is None:
            object.__setattr__(
                self,
                "logical_type",
                {
                    str: LogicalType.STRING,
                    int: LogicalType.INTEGER,
                    float: LogicalType.FLOAT,
                    bool: LogicalType.BOOLEAN,
                    type(None): LogicalType.UNKNOWN,
                }[type(self.value)],
            )
        if isinstance(self.value, float) and not math.isfinite(self.value):
            raise ValueConnectionError("Scalar numbers must be finite.")
        if type(self.value) is int and not -(2**63) <= self.value < 2**63:
            raise ValueConnectionError("Integer scalar is outside the Int64 range.")
        if self.logical_type is not None:
            if self.logical_type == LogicalType.UNKNOWN:
                if self.value is not None:
                    raise ValueConnectionError("An unknown scalar type only accepts null.")
            else:
                try:
                    ParameterDefinition.model_validate(
                        {"name": "scalar", "logical_type": self.logical_type.value}
                    ).checked(self.value)
                except ValueError as exc:
                    raise ValueConnectionError(str(exc)) from exc

    @property
    def formula(self) -> CompiledFormula:
        kind = self.logical_type
        assert kind is not None
        expression = pl.lit(self.value)
        if kind == LogicalType.DATE and isinstance(self.value, str):
            expression = pl.lit(date.fromisoformat(self.value))
        elif kind == LogicalType.DATETIME and isinstance(self.value, str):
            expression = pl.lit(datetime.fromisoformat(self.value))
        else:
            expression = expression.cast(logical_to_polars(kind))
        return CompiledFormula(expression, (), self.value is None, kind)


ExecutionValue = TableValue | FieldValue | ScalarValue
Operand = FieldValue | ScalarValue


@dataclass(frozen=True)
class ValueSchema:
    kind: Literal["dataset", "field", "scalar"]
    table: DatasetSchema | None = None
    logical_type: LogicalType | None = None
    context: RowContext | None = None
    nullable: bool = True
    referenced_columns: tuple[str, ...] = ()
    complexity: int = 1
    depth: int = 1

    def project(self, column_id: str) -> "ValueSchema":
        if self.kind != "dataset" or self.table is None or self.context is None:
            raise ValueConnectionError("Only a table output can provide a field projection.")
        field = project_schema(self.context, self.table, column_id)
        return ValueSchema(
            "field",
            logical_type=field.formula.logical_type,
            context=self.context,
            nullable=field.formula.nullable,
            referenced_columns=(column_id,),
        )


def parameter_scalar(
    name: str, definitions: tuple[ParameterDefinition, ...], supplied: dict[str, ParameterValue]
) -> ScalarValue:
    definition = next((item for item in definitions if item.name == name), None)
    if definition is None:
        raise ValueConnectionError(f"Workflow parameter '{name}' is not declared.")
    try:
        values = resolve_parameters(definitions, supplied)
    except ValueError as exc:
        raise ValueConnectionError(str(exc)) from exc
    return ScalarValue(values[name], LogicalType(definition.logical_type))


def project_field(table: TableValue, column_id: str) -> FieldValue:
    return project_schema(table.context, table.dataset.schema, column_id)


def project_schema(context: RowContext, schema: DatasetSchema, column_id: str) -> FieldValue:
    """Resolve a field for preflight without loading or materializing any data rows."""
    try:
        column = schema.by_id(column_id)
    except StopIteration as exc:
        raise ValueConnectionError(f"Connected field {column_id} no longer exists.") from exc
    return FieldValue(
        context,
        CompiledFormula(
            pl.col(column.engine_name), (column.column_id,), column.nullable, column.logical_type
        ),
    )


def require_context(expected: RowContext, actual: RowContext) -> None:
    if expected != actual:
        raise ValueConnectionError(
            "Fields belong to different table outputs. Join the tables using explicit keys first."
        )


def arithmetic(
    operation: Literal["add", "subtract", "multiply", "divide"],
    left: Operand,
    right: Operand,
    *,
    zero_policy: Literal["error", "null"] = "error",
) -> Operand:
    expressions = {"add": "a + b", "subtract": "a - b", "multiply": "a * b", "divide": "a / b"}
    if operation not in expressions or zero_policy not in {"error", "null"}:
        raise ValueConnectionError("Unknown arithmetic operation or division policy.")
    expression = expressions[operation]
    if operation == "divide" and zero_policy == "null":
        # An explicit null literal binding preserves the same safe compiler/type checker.
        result = combine(
            "safe_divide(a, b, fallback)", {"a": left, "b": right, "fallback": ScalarValue(None)}
        )
    else:
        result = combine(expression, {"a": left, "b": right})
    if isinstance(result, FieldValue):
        # Preserve arithmetic failures even when a later comparison masks infinity/NaN.
        invalid = result.formula.expression.is_infinite() | result.formula.expression.is_nan()
        result = replace(result, checks=(*result.checks, invalid))
    return result


def combine(expression: str, operands: dict[str, Operand]) -> Operand:
    fields = [value for value in operands.values() if isinstance(value, FieldValue)]
    for value in fields[1:]:
        require_context(fields[0].context, value.context)
    complexity = 1 + sum(
        value.complexity if isinstance(value, FieldValue) else 1 for value in operands.values()
    )
    depth = 1 + max((value.depth for value in fields), default=0)
    if complexity > 256 or depth > 64:
        raise ValueConnectionError("Field expression is too complex; add a table output first.")
    try:
        formula = compile_formula(
            expression,
            DatasetSchema(()),
            bindings={name: value.formula for name, value in operands.items()},
            allow_predicates=True,
        )
    except FormulaValidationError as exc:
        raise ValueConnectionError(str(exc)) from exc
    if fields:
        checks = tuple(check for value in fields for check in value.checks)
        if formula.logical_type == LogicalType.FLOAT:
            checks = (*checks, ~formula.expression.is_finite())
        return FieldValue(fields[0].context, formula, complexity, depth, checks)
    result = pl.select(formula.expression.alias("value")).item()
    if isinstance(result, float) and not math.isfinite(result):
        raise ValueConnectionError(
            "Arithmetic produced a non-finite value; check division by zero."
        )
    return ScalarValue(result, formula.logical_type)


def compare(
    operation: Literal["equal", "not_equal", "less", "less_equal", "greater", "greater_equal"],
    left: Operand,
    right: Operand,
) -> Operand:
    symbols = {
        "equal": "==",
        "not_equal": "!=",
        "less": "<",
        "less_equal": "<=",
        "greater": ">",
        "greater_equal": ">=",
    }
    if operation not in symbols:
        raise ValueConnectionError("Unknown comparison operation.")
    return combine(f"a {symbols[operation]} b", {"a": left, "b": right})


def logical(
    operation: Literal["and", "or", "not"], left: Operand, right: Operand | None = None
) -> Operand:
    if operation == "not" and right is None:
        return combine("not a", {"a": left})
    if operation in {"and", "or"} and right is not None:
        return combine(f"a {operation} b", {"a": left, "b": right})
    raise ValueConnectionError("Unknown logical operation or invalid number of inputs.")


def filter_rows(
    table: TableValue,
    predicate: FieldValue,
    *,
    output_context: RowContext,
    null_policy: Literal["drop", "keep", "error"],
) -> TableValue:
    require_context(table.context, predicate.context)
    if output_context == table.context:
        raise ValueConnectionError("A table transformation must have its own output context.")
    if predicate.formula.logical_type != LogicalType.BOOLEAN:
        raise ValueConnectionError("Filter requires a boolean field.")
    if null_policy not in {"drop", "keep", "error"}:
        raise ValueConnectionError("Select an explicit null predicate policy.")
    validate_field(table, predicate)
    expression = predicate.formula.expression
    if null_policy == "error" and table.dataset.frame.select(expression.is_null().any()).item():
        raise ValueConnectionError(
            "Filter predicate contains null values.", field="config.null_policy"
        )
    frame = table.dataset.frame.filter(expression.fill_null(null_policy == "keep"))
    return TableValue(
        output_context, Dataset(frame, table.dataset.schema, dict(table.dataset.metadata))
    )


def append_field(
    table: TableValue, value: Operand, *, output_context: RowContext, column_id: str, name: str
) -> TableValue:
    if isinstance(value, FieldValue):
        require_context(table.context, value.context)
        validate_field(table, value)
    if output_context == table.context:
        raise ValueConnectionError("A table transformation must have its own output context.")
    if not name.strip() or not column_id.strip():
        raise ValueConnectionError("A calculated field needs a name and a stable ID.")
    column = ColumnSchema(
        column_id,
        name,
        name,
        value.formula.logical_type,
        value.formula.nullable,
        {"source_columns": list(value.formula.referenced_columns)},
    )
    # Validate identities before executing: duplicate labels are safe; duplicate IDs/names are not.
    schema = DatasetSchema((*table.dataset.schema.columns, column))
    frame = table.dataset.frame.with_columns(value.formula.expression.alias(name))
    if table.dataset.row_count == 0:
        # Polars expands a scalar to one row on a zero-column frame. A field
        # append must preserve the input's cardinality, including an empty schema.
        frame = frame.head(0)
    if column.logical_type == LogicalType.FLOAT and frame[name].is_infinite().any():
        raise ValueConnectionError(
            "Arithmetic produced a non-finite value; check division by zero."
        )
    if column.logical_type == LogicalType.FLOAT and frame[name].is_nan().any():
        raise ValueConnectionError(
            "Arithmetic produced a non-finite value; check division by zero."
        )
    return TableValue(output_context, Dataset(frame, schema, dict(table.dataset.metadata)))


def sum_field(table: TableValue, value: FieldValue) -> ScalarValue:
    require_context(table.context, value.context)
    validate_field(table, value)
    if value.formula.logical_type not in {LogicalType.INTEGER, LogicalType.FLOAT}:
        raise ValueConnectionError("Sum requires a numeric field. Convert its type explicitly.")
    # Cast before summing to avoid wrapping Int64 totals, consistent with existing arithmetic.
    result = table.dataset.frame.select(value.formula.expression.cast(pl.Float64).sum()).item()
    return ScalarValue(result)


def validate_field(table: TableValue, value: FieldValue) -> None:
    require_context(table.context, value.context)
    if (
        value.checks
        and table.dataset.frame.select(
            pl.any_horizontal(value.checks).fill_null(False).any()
        ).item()
    ):
        raise ValueConnectionError(
            "Arithmetic produced a non-finite value; check division by zero."
        )


def dataset_outputs(dataset: Dataset, context: RowContext) -> dict[str, ExecutionValue]:
    """Adapt a legacy executor result to a named table output without copying data."""
    return {context.output_port: TableValue(context, dataset)}


def single_value(table: TableValue, value: FieldValue) -> ScalarValue:
    """Explicit cardinality boundary; never silently sum or choose a first row."""
    require_context(table.context, value.context)
    if table.dataset.row_count != 1:
        raise ValueConnectionError(
            "Single value requires exactly one row. Filter or aggregate the table explicitly.",
            field="table",
        )
    validate_field(table, value)
    result = table.dataset.frame.select(value.formula.expression.alias("value")).item()
    if isinstance(result, (date, datetime)):
        result = result.isoformat()
    return ScalarValue(result, value.formula.logical_type)
