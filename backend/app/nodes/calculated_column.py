import polars as pl
from pydantic import BaseModel, Field, field_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.formulas import compile_formula
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema, unary_definition


class CalculatedColumnConfig(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    expression: str = Field(min_length=1, max_length=4096)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str) -> str:
        name = " ".join(name.split())
        if not name:
            raise ValueError("Output field name must not be blank.")
        return name


class CalculatedColumnExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schema(input_schemas)
        config = CalculatedColumnConfig.model_validate(node.config)
        if config.name in {column.engine_name for column in schema.columns}:
            raise ValueError("Output field name already exists.")
        compiled = compile_formula(config.expression, schema, allow_predicates=True)
        column = ColumnSchema(
            f"calc_{node.id.hex}",
            config.name,
            config.name,
            compiled.logical_type,
            compiled.nullable,
            {"source_columns": list(compiled.referenced_columns)},
        )
        return DatasetSchema((*schema.columns, column))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        config = CalculatedColumnConfig.model_validate(node.config)
        compiled = compile_formula(config.expression, source.schema, allow_predicates=True)
        try:
            frame = source.frame.with_columns(compiled.expression.alias(config.name))
        except (pl.exceptions.InvalidOperationError, pl.exceptions.ComputeError) as exc:
            raise NodeExecutionError(
                "Formula could not convert or process a value. Check text, date formats and "
                "patterns; use Convert Types to inspect invalid values."
            ) from exc
        if (
            compiled.logical_type == LogicalType.FLOAT
            and frame.select((~pl.col(config.name).is_finite()).any()).item()
        ):
            raise NodeExecutionError(
                "Formula produced a non-finite number. Check division by zero or numeric overflow."
            )
        return Dataset(frame, schema, source.metadata)


def calculated_column_definition() -> NodeDefinition:
    return unary_definition(
        "calculated_column",
        "Calculated Column",
        "Create a field with safe typed expressions.",
        CalculatedColumnConfig,
        CalculatedColumnExecutor(),
    )
