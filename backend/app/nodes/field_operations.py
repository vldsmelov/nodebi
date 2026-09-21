"""General field/scalar operations; no project-specific computations."""

import json
from typing import Literal, cast

import polars as pl
from pydantic import BaseModel, ConfigDict, Field

from app.domain.datasets import ColumnSchema, DatasetSchema, LogicalType
from app.domain.formulas import CompiledFormula, compile_formula
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
    TypedNodeExecutor,
)
from app.domain.parameters import ParameterValue
from app.domain.values import (
    ExecutionValue,
    FieldValue,
    Operand,
    RowContext,
    ScalarValue,
    TableValue,
    ValueConnectionError,
    ValueSchema,
    append_field,
    arithmetic,
    compare,
    filter_rows,
    logical,
    parameter_scalar,
    require_context,
    sum_field,
)
from app.domain.workflows import NodeInstance


class StrictConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ConstantConfig(StrictConfig):
    value: ParameterValue
    logical_type: LogicalType | None = None


class ParameterConfig(StrictConfig):
    name: str = Field(min_length=1, max_length=64)


class ArithmeticConfig(StrictConfig):
    operation: Literal["add", "subtract", "multiply", "divide"]
    zero_policy: Literal["error", "null"] = "error"


class CompareConfig(StrictConfig):
    operation: Literal["equal", "not_equal", "less", "less_equal", "greater", "greater_equal"]


class LogicalConfig(StrictConfig):
    operation: Literal["and", "or", "not"]


class AppendConfig(StrictConfig):
    name: str = Field(min_length=1, max_length=200)


class MaskConfig(StrictConfig):
    null_policy: Literal["drop", "keep", "error"]


def scalar(node: NodeInstance, context: ExecutionContext) -> ScalarValue:
    if node.type == "scalar_constant":
        config = ConstantConfig.model_validate(node.config)
        return ScalarValue(config.value, config.logical_type)
    config_parameter = ParameterConfig.model_validate(node.config)
    return parameter_scalar(
        config_parameter.name, context.parameter_definitions, context.parameters
    )


def expression(node: NodeInstance) -> str:
    if node.type == "field_arithmetic":
        operation = ArithmeticConfig.model_validate(node.config).operation
        return {"add": "a + b", "subtract": "a - b", "multiply": "a * b", "divide": "a / b"}[
            operation
        ]
    if node.type == "field_compare":
        operation_compare = CompareConfig.model_validate(node.config).operation
        return (
            "a "
            + {
                "equal": "==",
                "not_equal": "!=",
                "less": "<",
                "less_equal": "<=",
                "greater": ">",
                "greater_equal": ">=",
            }[operation_compare]
            + " b"
        )
    operation_logical = LogicalConfig.model_validate(node.config).operation
    return "not a" if operation_logical == "not" else f"a {operation_logical} b"


class FieldOperationExecutor(TypedNodeExecutor):
    def infer_outputs(
        self, node: NodeInstance, inputs: dict[str, ValueSchema], context: ExecutionContext
    ) -> dict[str, ValueSchema]:
        if node.type in {"scalar_constant", "scalar_parameter"}:
            constant = scalar(node, context)
            return {
                "value": ValueSchema(
                    "scalar", logical_type=constant.logical_type, nullable=constant.value is None
                )
            }
        if node.type in {"field_arithmetic", "field_compare", "field_logical"}:
            expr = expression(node)
            expected = {"a"} if expr == "not a" else {"a", "b"}
            if inputs.keys() != expected:
                raise ValueConnectionError(
                    "Connect exactly the operands required by this operation."
                )
            fields = [value for value in inputs.values() if value.kind == "field"]
            for value in fields[1:]:
                assert fields[0].context is not None and value.context is not None
                require_context(fields[0].context, value.context)
            if any(
                value.kind == "dataset" or value.logical_type is None for value in inputs.values()
            ):
                raise ValueConnectionError("Connect a field or an explicit scalar.")
            complexity = 1 + sum(value.complexity for value in inputs.values())
            depth = 1 + max(value.depth for value in inputs.values())
            if complexity > 256 or depth > 64:
                raise ValueConnectionError(
                    "Field expression is too complex; add a table output first."
                )
            compiled = compile_formula(
                expr,
                DatasetSchema(()),
                allow_predicates=True,
                bindings={
                    name: CompiledFormula(
                        pl.col(name),
                        value.referenced_columns,
                        value.nullable,
                        cast(LogicalType, value.logical_type),
                    )
                    for name, value in inputs.items()
                },
            )
            return {
                "value": ValueSchema(
                    "field" if fields else "scalar",
                    logical_type=compiled.logical_type,
                    context=fields[0].context if fields else None,
                    referenced_columns=compiled.referenced_columns,
                    complexity=complexity,
                    depth=depth,
                )
            }
        table, value = inputs["table"], inputs["value"]
        if table.kind != "dataset" or table.table is None or table.context is None:
            raise ValueConnectionError("Connect a table to the table input.")
        if value.kind == "field":
            assert value.context is not None
            require_context(table.context, value.context)
        elif value.kind != "scalar" or node.type != "append_field":
            raise ValueConnectionError("This operation requires a field from the connected table.")
        if node.type == "field_sum":
            if value.logical_type not in {LogicalType.INTEGER, LogicalType.FLOAT}:
                raise ValueConnectionError(
                    "Sum requires a numeric field. Convert its type explicitly."
                )
            return {"value": ValueSchema("scalar", logical_type=LogicalType.FLOAT, nullable=False)}
        output_schema = table.table
        if node.type == "append_field":
            config = AppendConfig.model_validate(node.config)
            if not config.name.strip():
                raise ValueConnectionError("Enter an output field name.")
            output_schema = DatasetSchema(
                (
                    *table.table.columns,
                    ColumnSchema(
                        f"calc_{node.id.hex}",
                        config.name,
                        config.name,
                        cast(LogicalType, value.logical_type),
                        value.nullable,
                        {"source_columns": list(value.referenced_columns)},
                    ),
                )
            )
        elif value.logical_type != LogicalType.BOOLEAN:
            raise ValueConnectionError("Filter requires a boolean field.")
        return {
            "dataset": ValueSchema(
                "dataset",
                table=output_schema,
                context=RowContext(context.workflow_id, node.id, "dataset"),
            )
        }

    def execute_outputs(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        if node.type in {"scalar_constant", "scalar_parameter"}:
            return {"value": scalar(node, context)}
        if node.type in {"field_arithmetic", "field_compare", "field_logical"}:
            operands = cast(dict[str, Operand], inputs)
            if node.type == "field_arithmetic":
                config = ArithmeticConfig.model_validate(node.config)
                return {
                    "value": arithmetic(
                        config.operation,
                        operands["a"],
                        operands["b"],
                        zero_policy=config.zero_policy,
                    )
                }
            if node.type == "field_compare":
                compare_config = CompareConfig.model_validate(node.config)
                return {"value": compare(compare_config.operation, operands["a"], operands["b"])}
            logical_config = LogicalConfig.model_validate(node.config)
            return {"value": logical(logical_config.operation, operands["a"], operands.get("b"))}
        table = cast(TableValue, inputs["table"])
        value = cast(Operand, inputs["value"])
        if node.type == "field_sum":
            return {"value": sum_field(table, cast(FieldValue, value))}
        output_context = RowContext(context.workflow_id, node.id, "dataset")
        if node.type == "append_field":
            append_config = AppendConfig.model_validate(node.config)
            return {
                "dataset": append_field(
                    table,
                    value,
                    output_context=output_context,
                    column_id=f"calc_{node.id.hex}",
                    name=append_config.name,
                )
            }
        mask = MaskConfig.model_validate(node.config)
        return {
            "dataset": filter_rows(
                table,
                cast(FieldValue, value),
                output_context=output_context,
                null_policy=mask.null_policy,
            )
        }


def field_definitions() -> tuple[NodeDefinition, ...]:
    def operand(name: str, required: bool = True) -> PortDefinition:
        return PortDefinition(name, name, PortKind.FIELD, required, 1, (PortKind.SCALAR,))

    table_input = PortDefinition("table", "Table", PortKind.DATASET)
    field_input = PortDefinition("value", "Field", PortKind.FIELD)
    value_output = PortDefinition("value", "Value", PortKind.FIELD, False, None, (PortKind.SCALAR,))
    scalar_output = PortDefinition("value", "Scalar", PortKind.SCALAR, False, None)
    table_output = PortDefinition("dataset", "Table", PortKind.DATASET, False, None)
    specs: list[tuple[str, str, type[BaseModel], tuple[PortDefinition, ...], PortDefinition]] = [
        ("scalar_constant", "Constant", ConstantConfig, (), scalar_output),
        ("scalar_parameter", "Parameter", ParameterConfig, (), scalar_output),
        (
            "field_arithmetic",
            "Field arithmetic",
            ArithmeticConfig,
            (operand("a"), operand("b")),
            value_output,
        ),
        (
            "field_compare",
            "Field comparison",
            CompareConfig,
            (operand("a"), operand("b")),
            value_output,
        ),
        (
            "field_logical",
            "Field logic",
            LogicalConfig,
            (operand("a"), operand("b", False)),
            value_output,
        ),
        (
            "append_field",
            "Append field",
            AppendConfig,
            (table_input, operand("value")),
            table_output,
        ),
        ("field_filter", "Filter by field", MaskConfig, (table_input, field_input), table_output),
        ("field_sum", "Sum field", StrictConfig, (table_input, field_input), scalar_output),
    ]
    return tuple(
        NodeDefinition(
            kind,
            1,
            NodeCategory.TRANSFORM,
            name,
            name,
            ports,
            (output,),
            config,
            SchemaInferenceMode.STATIC,
            FieldOperationExecutor(),
            workflow_format=2,
            cache_identity=parameter_identity if kind == "scalar_parameter" else None,
        )
        for kind, name, config, ports, output in specs
    )


def parameter_identity(node: NodeInstance, context: ExecutionContext) -> str:
    value = scalar(node, context)
    return json.dumps({"value": value.value, "logical_type": value.logical_type}, sort_keys=True)
