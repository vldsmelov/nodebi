"""Materialize explicit chart bindings through the common typed execution contract."""

from dataclasses import replace

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
    TypedNodeExecutor,
)
from app.domain.values import (
    ExecutionValue,
    FieldValue,
    RowContext,
    ScalarValue,
    TableValue,
    ValueConnectionError,
    ValueSchema,
    require_context,
    validate_field,
)
from app.domain.visualizations import (
    CHART_NAMES,
    BoundVisualizationConfig,
    ChartType,
    bound_column_id,
    effective_visualization_config,
)
from app.domain.workflows import NodeInstance
from app.nodes.visualization import VisualizationExecutor


class BoundVisualizationExecutor(TypedNodeExecutor):
    def infer_outputs(
        self, node: NodeInstance, inputs: dict[str, ValueSchema], context: ExecutionContext
    ) -> dict[str, ValueSchema]:
        ports = ("category", "value") if node.type == "bar_chart" else ("value",)
        columns: list[ColumnSchema] = []
        table = inputs.get("table")
        if node.type == "bar_chart" or table is not None:
            if table is None or table.kind != "dataset" or table.table is None:
                raise ValueConnectionError(
                    "Connect the table used by the chart fields.", field="table"
                )
            columns.extend(table.table.columns)
        for port in ports:
            value = inputs.get(port)
            kind = "field" if node.type == "bar_chart" else "scalar"
            if value is None or value.kind != kind:
                raise ValueConnectionError(
                    f"This visualization input requires a {kind}.", field=port
                )
            if node.type == "bar_chart":
                assert table is not None and table.context is not None and value.context is not None
                try:
                    require_context(table.context, value.context)
                except ValueConnectionError as exc:
                    raise ValueConnectionError(str(exc), field=port) from exc
            if port == "value" and value.logical_type not in {
                LogicalType.INTEGER,
                LogicalType.FLOAT,
                LogicalType.UNKNOWN,
                *({LogicalType.STRING} if node.type == "kpi" else set()),
            }:
                raise ValueConnectionError(
                    "KPI requires a numeric or text scalar."
                    if node.type == "kpi"
                    else "Select a numeric value field.",
                    field=port,
                )
            identity = bound_column_id(node, port)
            # A unique engine alias avoids overwriting an unrelated upstream field.
            name = port
            while any(column.engine_name == name for column in columns):
                name += "_"
            columns.append(
                ColumnSchema(
                    identity,
                    name,
                    port.title(),
                    value.logical_type or LogicalType.UNKNOWN,
                    value.nullable,
                    {"source_columns": list(value.referenced_columns), "visualization_role": port},
                )
            )
        schema = DatasetSchema(tuple(columns))
        config = effective_visualization_config(node)
        legacy = replace(node, version=1, config=config.model_dump())
        VisualizationExecutor().infer_schema(legacy, {"input": schema}, context)
        return {
            "dataset": ValueSchema(
                "dataset", table=schema, context=RowContext(context.workflow_id, node.id, "dataset")
            )
        }

    def execute_outputs(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        schemas = {
            port: ValueSchema("dataset", table=value.dataset.schema, context=value.context)
            if isinstance(value, TableValue)
            else ValueSchema(
                "field" if isinstance(value, FieldValue) else "scalar",
                logical_type=value.formula.logical_type,
                nullable=value.formula.nullable,
                context=value.context if isinstance(value, FieldValue) else None,
                referenced_columns=value.formula.referenced_columns,
            )
            for port, value in inputs.items()
        }
        output = self.infer_outputs(node, schemas, context)["dataset"]
        assert output.table is not None and output.context is not None
        config = effective_visualization_config(node)
        if node.type == "bar_chart":
            table = inputs["table"]
            assert isinstance(table, TableValue)
            if table.dataset.row_count > 2000:
                raise ValueConnectionError(
                    "Chart exceeds 2000 points. Aggregate or explicitly filter the upstream data.",
                    field="table",
                )
            expressions = []
            for port in ("category", "value"):
                value = inputs[port]
                assert isinstance(value, FieldValue)
                try:
                    validate_field(table, value)
                except ValueConnectionError as exc:
                    raise ValueConnectionError(str(exc), field=port) from exc
                column = output.table.by_id(bound_column_id(node, port))
                expressions.append(value.formula.expression.alias(column.engine_name))
            frame = table.dataset.frame.with_columns(expressions)
        else:
            scalar = inputs["value"]
            assert isinstance(scalar, ScalarValue)
            column = output.table.by_id(bound_column_id(node, "value"))
            context_table = inputs.get("table")
            if isinstance(context_table, TableValue):
                if context_table.dataset.row_count != 1:
                    raise ValueConnectionError(
                        "KPI context requires exactly one row.", field="table"
                    )
                frame = context_table.dataset.frame.with_columns(
                    scalar.formula.expression.alias(column.engine_name)
                )
            else:
                frame = pl.select(scalar.formula.expression.alias(column.engine_name))
        dataset = Dataset(frame, output.table)
        try:
            dataset = VisualizationExecutor().execute(
                replace(node, version=1, config=config.model_dump()), {"input": dataset}, context
            )
        except NodeExecutionError as exc:
            raise ValueConnectionError(str(exc), field="value") from exc
        return {"dataset": TableValue(output.context, dataset)}


def bound_visualization_definitions() -> tuple[NodeDefinition, ...]:
    kinds: tuple[ChartType, ...] = ("bar_chart", "kpi")
    return tuple(
        NodeDefinition(
            type=kind,
            version=2,
            workflow_format=2,
            category=NodeCategory.VISUALIZATION,
            display_name=CHART_NAMES[kind],
            description="Display connected fields or a scalar. Configure aggregation upstream.",
            input_ports=(
                PortDefinition("table", "Table", PortKind.DATASET),
                PortDefinition("category", "Category", PortKind.FIELD),
                PortDefinition("value", "Value", PortKind.FIELD),
            )
            if kind == "bar_chart"
            else (
                PortDefinition("value", "Value", PortKind.SCALAR),
                PortDefinition("table", "Navigation context", PortKind.DATASET, required=False),
            ),
            output_ports=(
                PortDefinition("dataset", "Dataset", PortKind.DATASET, max_connections=None),
            ),
            config_schema=BoundVisualizationConfig,
            schema_inference_mode=SchemaInferenceMode.STATIC,
            executor=BoundVisualizationExecutor(),
        )
        for kind in kinds
    )
