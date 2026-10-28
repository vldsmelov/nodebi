"""Opt-in exact field/scalar operations. Version-1 Float64 semantics are unchanged."""

from collections.abc import Sequence
from dataclasses import replace
from decimal import Decimal
from fractions import Fraction
from typing import Literal, Self, cast

import polars as pl
from pydantic import BaseModel, Field, model_validator

from app.domain.datasets import LogicalType
from app.domain.decimal_composition import common_decimal_metadata
from app.domain.exact_formulas import bounded, round_exact
from app.domain.formulas import CompiledFormula, FormulaValidationError
from app.domain.nodes import ExecutionContext, NodeDefinition, TypedNodeExecutor
from app.domain.values import (
    ExecutionValue,
    FieldValue,
    ScalarValue,
    TableValue,
    ValueConnectionError,
    ValueSchema,
    require_context,
    validate_field,
)
from app.domain.workflows import NodeInstance
from app.nodes.field_operations import StrictConfig, field_definitions


class ExactPrecision(StrictConfig):
    precision: int = Field(default=38, ge=1, le=38, strict=True)
    scale: int = Field(default=2, ge=0, le=38, strict=True)
    rounding: Literal["half_even"] = "half_even"

    @model_validator(mode="after")
    def check_scale(self) -> Self:
        if self.scale > self.precision:
            raise ValueError("Decimal scale cannot exceed precision.")
        return self


class ExactConstantConfig(ExactPrecision):
    value: str | None = Field(
        default="1.00",
        max_length=80,
        pattern=r"^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$",
        strict=True,
    )


class ExactArithmeticConfig(ExactPrecision):
    operation: Literal["add", "subtract", "multiply", "divide"]
    zero_policy: Literal["error", "null"] = "error"


def exact_constant(node: NodeInstance) -> ScalarValue:
    config = ExactConstantConfig.model_validate(node.config)
    value = Decimal(config.value) if config.value is not None else None
    return ScalarValue(
        value,
        LogicalType.DECIMAL,
        {"precision": config.precision, "scale": config.scale, "rounding": config.rounding},
    )


def numeric_schema(value: ValueSchema, port: str) -> None:
    if value.kind not in {"field", "scalar"} or value.logical_type not in {
        LogicalType.INTEGER,
        LogicalType.DECIMAL,
        LogicalType.UNKNOWN,
    }:
        raise ValueConnectionError(
            "Exact operations require decimal or integer operands. Convert Float64 explicitly.",
            field=port,
        )
    if value.logical_type == LogicalType.DECIMAL:
        common_decimal_metadata([value.metadata])


def fraction(value: object) -> Fraction | None:
    if value is None:
        return None
    if type(value) is not int and not isinstance(value, Decimal):
        raise ValueConnectionError("Exact formula input does not match its numeric schema.")
    return bounded(Fraction(value))


def calculate(left: object, right: object, config: ExactArithmeticConfig) -> Decimal | None:
    a, b = fraction(left), fraction(right)
    if a is None or b is None:
        return None
    if config.operation == "divide" and b == 0:
        if config.zero_policy == "null":
            return None
        raise ValueConnectionError(
            "Exact division by zero. Select the null policy or correct the denominator."
        )
    value = {
        "add": lambda: a + b,
        "subtract": lambda: a - b,
        "multiply": lambda: a * b,
        "divide": lambda: a / b,
    }[config.operation]()
    return round_exact(bounded(value), config.precision, config.scale)


class ExactFieldExecutor(TypedNodeExecutor):
    def infer_outputs(
        self, node: NodeInstance, inputs: dict[str, ValueSchema], context: ExecutionContext
    ) -> dict[str, ValueSchema]:
        if node.type == "scalar_constant":
            constant = exact_constant(node)
            return {
                "value": ValueSchema(
                    "scalar",
                    logical_type=LogicalType.DECIMAL,
                    nullable=constant.value is None,
                    metadata=dict(constant.metadata),
                )
            }
        if node.type == "field_arithmetic":
            config = ExactArithmeticConfig.model_validate(node.config)
            if set(inputs) != {"a", "b"}:
                raise ValueConnectionError(
                    "Connect exactly the operands required by this operation."
                )
            fields = [value for value in inputs.values() if value.kind == "field"]
            for port, value in inputs.items():
                numeric_schema(value, port)
                if value.kind == "field":
                    assert value.context is not None and fields[0].context is not None
                    require_context(fields[0].context, value.context)
            complexity = 1 + sum(value.complexity for value in inputs.values())
            depth = 1 + max(value.depth for value in inputs.values())
            if complexity > 256 or depth > 64:
                raise ValueConnectionError(
                    "Field expression is too complex; add a table output first."
                )
            metadata = {
                "precision": config.precision,
                "scale": config.scale,
                "rounding": config.rounding,
            }
            return {
                "value": ValueSchema(
                    "field" if fields else "scalar",
                    logical_type=LogicalType.DECIMAL,
                    context=fields[0].context if fields else None,
                    nullable=True,
                    referenced_columns=tuple(
                        dict.fromkeys(c for v in inputs.values() for c in v.referenced_columns)
                    ),
                    complexity=complexity,
                    depth=depth,
                    metadata=metadata,
                )
            }
        table, value = inputs["table"], inputs["value"]
        if (
            table.kind != "dataset"
            or table.context is None
            or value.kind != "field"
            or value.context is None
        ):
            raise ValueConnectionError(
                "This operation requires a field from the connected table.", field="value"
            )
        require_context(table.context, value.context)
        numeric_schema(value, "value")
        metadata = {
            **value.metadata,
            "precision": 38,
            "scale": value.metadata["scale"] if value.logical_type == LogicalType.DECIMAL else 0,
        }
        return {
            "value": ValueSchema(
                "scalar",
                logical_type=LogicalType.DECIMAL,
                nullable=value.nullable if node.type == "field_scalar" else False,
                metadata=metadata,
            )
        }

    def execute_outputs(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        try:
            return self.execute_exact(node, inputs, context)
        except (FormulaValidationError, ArithmeticError) as exc:
            raise ValueConnectionError(str(exc), field="value") from exc

    def execute_exact(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        if node.type == "scalar_constant":
            return {"value": exact_constant(node)}
        schemas = {
            port: ValueSchema("dataset", table=value.dataset.schema, context=value.context)
            if isinstance(value, TableValue)
            else ValueSchema(
                "field" if isinstance(value, FieldValue) else "scalar",
                logical_type=value.formula.logical_type,
                nullable=value.formula.nullable,
                context=value.context if isinstance(value, FieldValue) else None,
                referenced_columns=value.formula.referenced_columns,
                metadata=dict(value.formula.metadata),
                complexity=value.complexity if isinstance(value, FieldValue) else 1,
                depth=value.depth if isinstance(value, FieldValue) else 1,
            )
            for port, value in inputs.items()
        }
        schema = self.infer_outputs(node, schemas, context)["value"]
        if node.type == "field_arithmetic":
            config = ExactArithmeticConfig.model_validate(node.config)
            left, right = (
                cast(FieldValue | ScalarValue, inputs["a"]),
                cast(FieldValue | ScalarValue, inputs["b"]),
            )
            if isinstance(left, ScalarValue) and isinstance(right, ScalarValue):
                return {
                    "value": ScalarValue(
                        calculate(left.value, right.value, config),
                        LogicalType.DECIMAL,
                        schema.metadata,
                    )
                }
            fields = [v for v in (left, right) if isinstance(v, FieldValue)]
            field_index = 0 if isinstance(left, FieldValue) else 1

            def batch(series: Sequence[pl.Series]) -> pl.Series:
                count = len(series[field_index])
                values = [
                    calculate(
                        series[0][0 if len(series[0]) == 1 else i],
                        series[1][0 if len(series[1]) == 1 else i],
                        config,
                    )
                    for i in range(count)
                ]
                return pl.Series(values, dtype=pl.Decimal(config.precision, config.scale))

            expr = pl.map_batches(
                [left.formula.expression, right.formula.expression],
                batch,
                return_dtype=pl.Decimal(config.precision, config.scale),
                is_elementwise=True,
            )
            return {
                "value": FieldValue(
                    fields[0].context,
                    CompiledFormula(
                        expr, schema.referenced_columns, True, LogicalType.DECIMAL, schema.metadata
                    ),
                    schema.complexity,
                    schema.depth,
                    tuple(c for v in fields for c in v.checks),
                )
            }
        table, value = cast(TableValue, inputs["table"]), cast(FieldValue, inputs["value"])
        validate_field(table, value)
        if node.type == "field_scalar" and table.dataset.row_count != 1:
            raise ValueConnectionError(
                "Single value requires exactly one row. Filter or aggregate the table explicitly.",
                field="table",
            )
        series = table.dataset.frame.select(value.formula.expression.alias("value"))["value"]
        if node.type == "field_scalar":
            result = fraction(series[0])
        else:
            result = Fraction(0)
            for item in series:
                result = cast(Fraction, bounded(result + (fraction(item) or 0)))
        return {
            "value": ScalarValue(
                round_exact(result, 38, schema.metadata["scale"]),
                LogicalType.DECIMAL,
                schema.metadata,
            )
        }


def exact_field_definitions() -> tuple[NodeDefinition, ...]:
    configs: dict[str, type[BaseModel]] = {
        "scalar_constant": ExactConstantConfig,
        "field_arithmetic": ExactArithmeticConfig,
        "field_sum": StrictConfig,
        "field_scalar": StrictConfig,
    }
    return tuple(
        replace(
            definition,
            version=2,
            display_name=f"Exact {definition.display_name}",
            description=(
                "Exact decimal/integer values; no implicit Float64 conversion. "
                "Arithmetic rounds half-even at each node."
            ),
            config_schema=configs[definition.type],
            executor=ExactFieldExecutor(),
        )
        for definition in field_definitions()
        if definition.type in configs
    )
