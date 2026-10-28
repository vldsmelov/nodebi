"""Exact a/b/c expressions reuse the table formula language, not a second evaluator."""

from collections.abc import Sequence
from dataclasses import replace
from decimal import Decimal
from typing import cast

import polars as pl
from pydantic import Field

from app.domain.datasets import ColumnSchema, DatasetSchema, LogicalType
from app.domain.exact_formulas import ExactFormula, compile_exact_formula, exact_input, round_exact
from app.domain.formulas import CompiledFormula, FormulaValidationError
from app.domain.nodes import ExecutionContext, NodeDefinition, TypedNodeExecutor
from app.domain.values import (
    ExecutionValue,
    FieldValue,
    ScalarValue,
    ValueConnectionError,
    ValueSchema,
    require_context,
)
from app.domain.workflows import NodeInstance
from app.nodes.exact_field_operations import ExactPrecision
from app.nodes.field_operations import field_definitions


class ExactFieldFormulaConfig(ExactPrecision):
    expression: str = Field(min_length=1, max_length=4096)


def compile_bindings(
    config: ExactFieldFormulaConfig, inputs: dict[str, ValueSchema]
) -> ExactFormula:
    if inputs.keys() - {"a", "b", "c"} or any(
        value.kind not in {"field", "scalar"} or value.logical_type is None
        for value in inputs.values()
    ):
        raise ValueConnectionError("Connect a field or an explicit scalar.")
    return compile_exact_formula(
        config.expression,
        DatasetSchema(
            tuple(
                ColumnSchema(
                    port,
                    port,
                    port,
                    cast(LogicalType, value.logical_type),
                    value.nullable,
                    dict(value.metadata),
                )
                for port, value in inputs.items()
            )
        ),
    )


class ExactFieldFormulaExecutor(TypedNodeExecutor):
    def infer_outputs(
        self, node: NodeInstance, inputs: dict[str, ValueSchema], context: ExecutionContext
    ) -> dict[str, ValueSchema]:
        config = ExactFieldFormulaConfig.model_validate(node.config)
        try:
            compile_bindings(config, inputs)
        except FormulaValidationError as exc:
            raise ValueConnectionError(str(exc), field="config.expression") from exc
        fields = [value for value in inputs.values() if value.kind == "field"]
        for value in fields:
            assert fields[0].context is not None and value.context is not None
            require_context(fields[0].context, value.context)
        complexity = 1 + sum(value.complexity for value in inputs.values())
        depth = 1 + max((value.depth for value in inputs.values()), default=0)
        if complexity > 256 or depth > 64:
            raise ValueConnectionError("Field expression is too complex; add a table output first.")
        return {
            "value": ValueSchema(
                "field" if fields else "scalar",
                logical_type=LogicalType.DECIMAL,
                context=fields[0].context if fields else None,
                nullable=True,
                referenced_columns=tuple(
                    dict.fromkeys(
                        column for value in inputs.values() for column in value.referenced_columns
                    )
                ),
                complexity=complexity,
                depth=depth,
                metadata={
                    "precision": config.precision,
                    "scale": config.scale,
                    "rounding": config.rounding,
                },
            )
        }

    def execute_outputs(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        if any(not isinstance(value, (FieldValue, ScalarValue)) for value in inputs.values()):
            raise ValueConnectionError("Connect a field or an explicit scalar.")
        operands = cast(dict[str, FieldValue | ScalarValue], inputs)
        schemas = {
            port: ValueSchema(
                "field" if isinstance(value, FieldValue) else "scalar",
                logical_type=value.formula.logical_type,
                nullable=value.formula.nullable,
                context=value.context if isinstance(value, FieldValue) else None,
                referenced_columns=value.formula.referenced_columns,
                metadata=dict(value.formula.metadata),
                complexity=value.complexity if isinstance(value, FieldValue) else 1,
                depth=value.depth if isinstance(value, FieldValue) else 1,
            )
            for port, value in operands.items()
        }
        schema = self.infer_outputs(node, schemas, context)["value"]
        config = ExactFieldFormulaConfig.model_validate(node.config)
        compiled = compile_bindings(config, schemas)
        ports = list(operands)
        indices = [ports.index(name) for name in compiled.engine_names]
        fields = [value for value in operands.values() if isinstance(value, FieldValue)]

        def evaluate(series: Sequence[pl.Series], row: int) -> Decimal | None:
            try:
                values = tuple(
                    exact_input(series[index][0 if len(series[index]) == 1 else row], kind)
                    for index, kind in zip(indices, compiled.logical_types, strict=True)
                )
                return round_exact(compiled.root.evaluate(values), config.precision, config.scale)
            except (FormulaValidationError, ArithmeticError) as exc:
                raise ValueConnectionError(str(exc), field="config.expression") from exc

        expressions = [value.formula.expression for value in operands.values()]
        if not fields:
            values = [pl.select(expr).to_series() for expr in expressions]
            return {"value": ScalarValue(evaluate(values, 0), LogicalType.DECIMAL, schema.metadata)}

        # Keep an actual field as a population anchor even for constant-only expressions.
        anchor = next(
            index for index, value in enumerate(operands.values()) if isinstance(value, FieldValue)
        )
        dtype = pl.Decimal(config.precision, config.scale)

        def batch(series: Sequence[pl.Series]) -> pl.Series:
            return pl.Series([evaluate(series, i) for i in range(len(series[anchor]))], dtype=dtype)

        expression = pl.map_batches(expressions, batch, return_dtype=dtype, is_elementwise=True)
        return {
            "value": FieldValue(
                fields[0].context,
                CompiledFormula(
                    expression,
                    schema.referenced_columns,
                    True,
                    LogicalType.DECIMAL,
                    schema.metadata,
                ),
                schema.complexity,
                schema.depth,
                tuple(check for value in fields for check in value.checks),
            )
        }


def exact_field_formula_definition() -> NodeDefinition:
    return replace(
        next(
            definition for definition in field_definitions() if definition.type == "field_formula"
        ),
        version=2,
        display_name="Exact Field expression",
        description="Exact expression over a/b/c with one final half-even rounding.",
        config_schema=ExactFieldFormulaConfig,
        executor=ExactFieldFormulaExecutor(),
    )
