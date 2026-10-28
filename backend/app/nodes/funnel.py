"""Explicit ordered-stage transitions; no implicit cohort aggregation or value sorting."""

import json
import math
from dataclasses import replace
from fractions import Fraction
from typing import Any
from uuid import uuid5

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.exact_formulas import round_exact
from app.domain.formulas import FormulaValidationError
from app.domain.funnel import MAX_STAGES, PERCENT_SCALE, FunnelConfig
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
    RowContext,
    TableValue,
    ValueConnectionError,
    ValueSchema,
)
from app.domain.workflows import NodeInstance
from app.nodes.histogram import exact_text


def funnel_fields(
    node: NodeInstance, source: DatasetSchema
) -> tuple[ColumnSchema, ColumnSchema, ColumnSchema]:
    config = FunnelConfig.model_validate(node.config)
    try:
        stage, order, value = (
            source.by_id(identity)
            for identity in (config.stage_column_id, config.order_column_id, config.value_column_id)
        )
    except StopIteration as error:
        raise ValueConnectionError("A selected funnel field is unavailable.") from error
    if stage.logical_type not in {
        LogicalType.STRING,
        LogicalType.INTEGER,
        LogicalType.BOOLEAN,
        LogicalType.DATE,
    }:
        raise ValueConnectionError("Funnel stages require text, integer, boolean or date fields.")
    if order.logical_type != LogicalType.INTEGER:
        raise ValueConnectionError("Choose an integer funnel order field.")
    if value.logical_type not in {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}:
        raise ValueConnectionError("Choose a numeric funnel value field.")
    if value.logical_type == LogicalType.DECIMAL:
        scale = value.metadata.get("scale")
        if type(scale) is not int or not 0 <= scale <= 38:
            raise ValueConnectionError("Funnel decimals require an explicit scale from 0 to 38.")
    return stage, order, value


def funnel_schemas(node: NodeInstance, source: DatasetSchema) -> dict[str, DatasetSchema]:
    stage, order, value = funnel_fields(node, source)
    number_type = (
        LogicalType.FLOAT if value.logical_type == LogicalType.FLOAT else LogicalType.DECIMAL
    )
    metadata = {**value.metadata, "source_columns": [value.column_id]}
    if number_type == LogicalType.DECIMAL:
        metadata.update(
            precision=38,
            scale=value.metadata["scale"] if value.logical_type == LogicalType.DECIMAL else 0,
        )

    def col(
        name: str,
        title: str,
        kind: LogicalType,
        nullable: bool = False,
        meta: dict[str, Any] | None = None,
    ) -> ColumnSchema:
        return ColumnSchema(f"funnel_{node.id.hex}_{name}", name, title, kind, nullable, meta or {})

    def amount(name: str, title: str, nullable: bool = False) -> ColumnSchema:
        return col(name, title, number_type, nullable, metadata)

    def percent(name: str, title: str) -> ColumnSchema:
        return col(
            name,
            title,
            LogicalType.DECIMAL,
            True,
            {
                "precision": 38,
                "scale": PERCENT_SCALE,
                "unit": "%",
                "rounding": "half_even",
                "source_columns": [value.column_id],
            },
        )

    return {
        "dataset": DatasetSchema(
            (
                col("point_id", "Stage identity", LogicalType.STRING),
                replace(
                    stage,
                    column_id=f"funnel_{node.id.hex}_stage",
                    engine_name="stage",
                    nullable=False,
                    metadata={**stage.metadata, "source_columns": [stage.column_id]},
                ),
                replace(
                    order,
                    column_id=f"funnel_{node.id.hex}_order",
                    engine_name="order",
                    nullable=False,
                    metadata={**order.metadata, "source_columns": [order.column_id]},
                ),
                amount("value", value.display_name),
                percent("previous_percent", "Previous-stage retention (%)"),
                percent("initial_percent", "Initial-stage retention (%)"),
                amount("loss", "Loss from previous stage", True),
                col("previous_exact", "Exact previous-stage retention", LogicalType.STRING, True),
                col("initial_exact", "Exact initial-stage retention", LogicalType.STRING, True),
            )
        ),
        "summary": DatasetSchema(
            (
                col("stage_count", "Stage count", LogicalType.INTEGER),
                amount("initial_value", "Initial value", True),
                amount("final_value", "Final value", True),
                percent("overall_percent", "Overall retention (%)"),
                col("overall_exact", "Exact overall retention", LogicalType.STRING, True),
            )
        ),
    }


def _number(value: Fraction, column: ColumnSchema) -> Any:
    if column.logical_type == LogicalType.FLOAT:
        try:
            number = float(value)
        except OverflowError as error:
            raise ValueConnectionError("Funnel amount exceeds the numeric range.") from error
        if not math.isfinite(number):
            raise ValueConnectionError("Funnel amount exceeds the numeric range.")
        return number
    try:
        exact = round_exact(value, 38, column.metadata["scale"])
    except FormulaValidationError as error:
        raise ValueConnectionError(
            "Funnel amount exceeds its declared decimal precision."
        ) from error
    assert exact is not None
    if Fraction(exact) != value:
        raise ValueConnectionError("Funnel values do not match their declared decimal scale.")
    return exact


def _percent(value: Fraction | None) -> Any:
    return round_exact(value * 100, 38, PERCENT_SCALE) if value is not None else None


class FunnelExecutor(TypedNodeExecutor):
    def infer_outputs(
        self, node: NodeInstance, inputs: dict[str, ValueSchema], context: ExecutionContext
    ) -> dict[str, ValueSchema]:
        source = inputs.get("input")
        if source is None or source.kind != "dataset" or source.table is None:
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        return {
            port: ValueSchema(
                "dataset", table=schema, context=RowContext(context.workflow_id, node.id, port)
            )
            for port, schema in funnel_schemas(node, source.table).items()
        }

    def execute_outputs(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        table = inputs.get("input")
        if not isinstance(table, TableValue):
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        source = table.dataset
        stage, order, value = funnel_fields(node, source.schema)
        schemas = funnel_schemas(node, source.schema)
        if source.row_count > MAX_STAGES:
            raise ValueConnectionError(
                "Funnel supports at most 50 complete stages. Prepare stages upstream."
            )
        keys, orders, values = (source.frame[c.engine_name] for c in (stage, order, value))
        if keys.null_count() or (
            source.row_count
            and stage.logical_type == LogicalType.STRING
            and keys.str.strip_chars().eq("").any()
        ):
            raise ValueConnectionError("Funnel stages must be non-empty.")
        if keys.n_unique() != source.row_count:
            raise ValueConnectionError(
                "Funnel needs one row per stage. Aggregate explicitly upstream."
            )
        if orders.null_count() or orders.n_unique() != source.row_count:
            raise ValueConnectionError("Funnel order values must be non-empty and unique.")
        if source.row_count and not orders.dtype.is_integer():
            raise ValueConnectionError("Funnel order must contain integers, not encoded text.")
        if values.null_count():
            raise ValueConnectionError(
                "Funnel values cannot be empty. Correct the prepared stages upstream."
            )
        if source.row_count:
            if not values.dtype.is_numeric():
                raise ValueConnectionError("Funnel values must contain numbers, not encoded text.")
            if values.dtype.is_float() and not values.is_finite().all():
                raise ValueConnectionError("Funnel values must be finite.")
            if values.lt(0).any():
                raise ValueConnectionError("Funnel values cannot be negative.")
        ordered = source.frame.select([c.engine_name for c in (stage, order, value)]).sort(
            order.engine_name
        )
        amounts = [Fraction(str(raw)) for raw in ordered[value.engine_name]]
        if any(a < b for a, b in zip(amounts, amounts[1:], strict=False)):
            raise ValueConnectionError(
                "Funnel values must not increase between ordered stages. "
                "Check the population or use a bar chart."
            )
        amount_column = schemas["dataset"].by_name("value")
        first = amounts[0] if amounts else None
        rows = []
        for i, (key, position, amount) in enumerate(
            zip(ordered[stage.engine_name], ordered[order.engine_name], amounts, strict=True)
        ):
            previous = amounts[i - 1] if i else None
            step_share = amount / previous if previous else None
            initial_share = amount / first if first else None
            identity = str(
                uuid5(
                    node.id,
                    json.dumps(
                        [stage.column_id, stage.logical_type.value, key],
                        default=str,
                        ensure_ascii=False,
                    ),
                )
            )
            rows.append(
                [
                    identity,
                    key,
                    position,
                    _number(amount, amount_column),
                    _percent(step_share),
                    _percent(initial_share),
                    _number(previous - amount, amount_column) if previous is not None else None,
                    exact_text(step_share) if step_share is not None else None,
                    exact_text(initial_share) if initial_share is not None else None,
                ]
            )
        overall = amounts[-1] / first if first else None
        summary = [
            [
                source.row_count,
                _number(first, amount_column) if first is not None else None,
                _number(amounts[-1], amount_column) if amounts else None,
                _percent(overall),
                exact_text(overall) if overall is not None else None,
            ]
        ]
        outputs: dict[str, ExecutionValue] = {}
        for port, schema in schemas.items():
            dtypes = {
                c.engine_name: keys.dtype
                if c.engine_name == "stage"
                else orders.dtype
                if c.engine_name == "order"
                else pl.Decimal(38, c.metadata["scale"])
                if c.logical_type == LogicalType.DECIMAL
                else pl.Float64
                if c.logical_type == LogicalType.FLOAT
                else pl.Int64
                if c.logical_type == LogicalType.INTEGER
                else pl.String
                for c in schema.columns
            }
            outputs[port] = TableValue(
                RowContext(context.workflow_id, node.id, port),
                Dataset(
                    pl.DataFrame(
                        rows if port == "dataset" else summary, schema=dtypes, orient="row"
                    ),
                    schema,
                    {
                        "exact_transport": True,
                        "statistics": {
                            "input_rows": source.row_count,
                            "order": "explicit_integer_ascending",
                            "percentage_scale": PERCENT_SCALE,
                            "percentage_rounding": "half_even",
                        },
                    },
                ),
            )
        return outputs


def funnel_definition() -> NodeDefinition:
    return NodeDefinition(
        type="funnel_steps",
        version=1,
        workflow_format=2,
        category=NodeCategory.TRANSFORM,
        display_name="Funnel stages",
        description="Compare ordered prepared stages and calculate retention and loss.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(
            PortDefinition("dataset", "Ordered stages", PortKind.DATASET, False, None),
            PortDefinition("summary", "Funnel population", PortKind.DATASET, False, None),
        ),
        config_schema=FunnelConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=FunnelExecutor(),
    )
