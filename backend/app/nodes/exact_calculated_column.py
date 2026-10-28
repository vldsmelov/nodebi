"""Explicit decimal output; existing calculated_column@1 keeps its original semantics."""

from dataclasses import replace
from decimal import Decimal
from typing import Literal, Self

import polars as pl
from pydantic import ConfigDict, Field, model_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.exact_formulas import compile_exact_formula, exact_input, round_exact
from app.domain.formulas import FormulaValidationError
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.calculated_column import CalculatedColumnConfig, calculated_column_definition
from app.nodes.common import UnaryExecutor, input_schema


class ExactCalculatedColumnConfig(CalculatedColumnConfig):
    model_config = ConfigDict(extra="forbid")
    precision: int = Field(default=38, ge=1, le=38, strict=True)
    scale: int = Field(default=2, ge=0, le=38, strict=True)
    rounding: Literal["half_even"] = "half_even"

    @model_validator(mode="after")
    def valid_scale(self) -> Self:
        if self.scale > self.precision:
            raise ValueError("Decimal scale cannot exceed precision.")
        return self


class ExactCalculatedColumnExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        source = input_schema(input_schemas)
        config = ExactCalculatedColumnConfig.model_validate(node.config)
        if config.name in {column.engine_name for column in source.columns}:
            raise ValueError("Output field name already exists.")
        compiled = compile_exact_formula(config.expression, source)
        column = ColumnSchema(
            f"calc_{node.id.hex}",
            config.name,
            config.name,
            LogicalType.DECIMAL,
            True,
            {
                "source_columns": list(compiled.referenced_columns),
                "precision": config.precision,
                "scale": config.scale,
                "rounding": config.rounding,
            },
        )
        return DatasetSchema((*source.columns, column))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        config = ExactCalculatedColumnConfig.model_validate(node.config)
        compiled = compile_exact_formula(config.expression, source.schema)

        try:
            values: list[Decimal | None]
            if compiled.engine_names:
                values = [
                    round_exact(
                        compiled.root.evaluate(
                            tuple(
                                exact_input(v, kind)
                                for v, kind in zip(row, compiled.logical_types, strict=True)
                            )
                        ),
                        config.precision,
                        config.scale,
                    )
                    for row in source.frame.select(compiled.engine_names).iter_rows()
                ]
            else:
                value = (
                    round_exact(compiled.root.evaluate(()), config.precision, config.scale)
                    if source.row_count
                    else None
                )
                values = [value] * source.row_count
            result = pl.Series(
                config.name, values, dtype=pl.Decimal(config.precision, config.scale)
            )
        except (FormulaValidationError, ArithmeticError, pl.exceptions.PolarsError) as exc:
            message = (
                str(exc)
                if isinstance(exc, FormulaValidationError)
                else "Exact formula could not produce a decimal result. "
                "Check precision and input values."
            )
            raise NodeExecutionError(message) from exc
        return Dataset(
            source.frame.with_columns(result), schema, {**source.metadata, "exact_transport": True}
        )


def exact_calculated_column_definition() -> NodeDefinition:
    return replace(
        calculated_column_definition(),
        version=2,
        display_name="Exact Calculated Column",
        description=(
            "Exact decimal arithmetic with explicit precision and final half-even rounding."
        ),
        config_schema=ExactCalculatedColumnConfig,
        executor=ExactCalculatedColumnExecutor(),
    )
