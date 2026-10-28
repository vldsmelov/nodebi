"""Explicit ranking and full-population cumulative contributions on prepared categories."""

import json
import math
import uuid
from dataclasses import replace
from fractions import Fraction
from typing import Any

import polars as pl
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.exact_formulas import round_exact
from app.domain.formulas import FormulaValidationError
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

PERCENT_SCALE = 12


class ParetoConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category_column_id: str = Field(min_length=1)
    value_column_id: str = Field(min_length=1)

    @model_validator(mode="after")
    def distinct_fields(self) -> "ParetoConfig":
        if self.category_column_id == self.value_column_id:
            raise ValueError("Choose separate Pareto category and contribution fields.")
        return self


def pareto_fields(node: NodeInstance, source: DatasetSchema) -> tuple[ColumnSchema, ColumnSchema]:
    config = ParetoConfig.model_validate(node.config)
    try:
        category = source.by_id(config.category_column_id)
        value = source.by_id(config.value_column_id)
    except StopIteration as error:
        raise ValueConnectionError("A selected Pareto field is unavailable.") from error
    if category.logical_type not in {
        LogicalType.STRING,
        LogicalType.INTEGER,
        LogicalType.DATE,
        LogicalType.BOOLEAN,
    }:
        raise ValueConnectionError(
            "Pareto categories require text, integer, boolean or date fields."
        )
    if value.logical_type not in {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}:
        raise ValueConnectionError("Choose a numeric Pareto contribution field.")
    if value.logical_type == LogicalType.DECIMAL:
        scale = value.metadata.get("scale")
        if type(scale) is not int or not 0 <= scale <= 38:
            raise ValueConnectionError(
                "Pareto decimal values require an explicit scale from 0 to 38."
            )
    return category, value


def pareto_schemas(node: NodeInstance, source: DatasetSchema) -> dict[str, DatasetSchema]:
    category, value = pareto_fields(node, source)
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
        *,
        nullable: bool = False,
        meta: dict[str, Any] | None = None,
    ) -> ColumnSchema:
        return ColumnSchema(f"pareto_{node.id.hex}_{name}", name, title, kind, nullable, meta or {})

    def amount(name: str, title: str) -> ColumnSchema:
        return col(name, title, number_type, meta=metadata)

    def percent(name: str, title: str) -> ColumnSchema:
        return col(
            name,
            title,
            LogicalType.DECIMAL,
            nullable=True,
            meta={
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
                col("point_id", "Category identity", LogicalType.STRING),
                col("rank", "Rank", LogicalType.INTEGER),
                replace(
                    category,
                    column_id=f"pareto_{node.id.hex}_category",
                    engine_name="category",
                    nullable=False,
                    metadata={**category.metadata, "source_columns": [category.column_id]},
                ),
                amount("value", value.display_name),
                amount("cumulative_value", "Cumulative contribution"),
                percent("share_percent", "Share (%)"),
                percent("cumulative_percent", "Cumulative share (%)"),
                col("share_exact", "Exact share", LogicalType.STRING, nullable=True),
                col(
                    "cumulative_exact", "Exact cumulative share", LogicalType.STRING, nullable=True
                ),
            )
        ),
        "summary": DatasetSchema(
            (
                col("input_count", "Input categories", LogicalType.INTEGER),
                col("zero_count", "Zero contributions", LogicalType.INTEGER),
                amount("total_value", "Total contribution"),
            )
        ),
    }


def _number(value: Fraction, column: ColumnSchema) -> Any:
    if column.logical_type == LogicalType.FLOAT:
        try:
            floating = float(value)
        except OverflowError as error:
            raise ValueConnectionError("Pareto total exceeds the numeric range.") from error
        if not math.isfinite(floating):
            raise ValueConnectionError("Pareto total exceeds the numeric range.")
        return floating
    try:
        number = round_exact(value, 38, column.metadata["scale"])
    except FormulaValidationError as error:
        raise ValueConnectionError(
            "Pareto total exceeds decimal precision. Rescale explicitly upstream."
        ) from error
    assert number is not None
    if Fraction(number) != value:
        raise ValueConnectionError("Pareto values do not match their declared decimal scale.")
    return number


class ParetoExecutor(TypedNodeExecutor):
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
            for port, schema in pareto_schemas(node, source.table).items()
        }

    def execute_outputs(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        table = inputs.get("input")
        if not isinstance(table, TableValue):
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        source = table.dataset
        category, value = pareto_fields(node, source.schema)
        schemas = pareto_schemas(node, source.schema)
        keys, values = source.frame[category.engine_name], source.frame[value.engine_name]
        if keys.null_count() or (
            source.row_count
            and category.logical_type == LogicalType.STRING
            and keys.str.strip_chars().eq("").any()
        ):
            raise ValueConnectionError("Pareto categories must be non-empty.")
        if keys.n_unique() != source.row_count:
            raise ValueConnectionError(
                "Pareto needs one row per category. Aggregate duplicate categories upstream."
            )
        if values.null_count():
            raise ValueConnectionError(
                "Pareto contributions cannot be empty. Correct or explicitly filter them upstream."
            )
        if source.row_count:
            if not values.dtype.is_numeric():
                raise ValueConnectionError(
                    "Pareto contributions must contain numeric values, not encoded text."
                )
            if values.dtype.is_float() and not values.is_finite().all():
                raise ValueConnectionError("Pareto contributions must be finite.")
            if values.lt(0).any():
                raise ValueConnectionError(
                    "Pareto contributions cannot be negative. Choose a non-negative measure."
                )
        ordered = source.frame.select([category.engine_name, value.engine_name]).sort(
            [value.engine_name, category.engine_name],
            descending=[True, False],
        )
        amounts = [Fraction(str(raw)) for raw in ordered[value.engine_name]]
        total = sum(amounts, Fraction(0))
        amount_column = schemas["dataset"].by_name("value")
        checked_total = _number(total, amount_column)
        rows = []
        cumulative = Fraction(0)
        for index, (key, amount) in enumerate(
            zip(ordered[category.engine_name], amounts, strict=True)
        ):
            cumulative += amount
            share = amount / total if total else None
            running = cumulative / total if total else None
            identity = str(
                uuid.uuid5(
                    node.id,
                    json.dumps(
                        [category.column_id, category.logical_type.value, key],
                        default=str,
                        ensure_ascii=False,
                    ),
                )
            )
            rows.append(
                [
                    identity,
                    index + 1,
                    key,
                    _number(amount, amount_column),
                    _number(cumulative, amount_column),
                    round_exact(share * 100, 38, PERCENT_SCALE) if share is not None else None,
                    round_exact(running * 100, 38, PERCENT_SCALE) if running is not None else None,
                    exact_text(share) if share is not None else None,
                    exact_text(running) if running is not None else None,
                ]
            )
        summary = [[source.row_count, sum(amount == 0 for amount in amounts), checked_total]]
        outputs: dict[str, ExecutionValue] = {}
        for port, schema in schemas.items():
            dtypes = {
                c.engine_name: keys.dtype
                if c.engine_name == "category"
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
                            "order": "value_desc_category_asc",
                            "percentage_scale": PERCENT_SCALE,
                            "percentage_rounding": "half_even",
                        },
                    },
                ),
            )
        return outputs


def pareto_definition() -> NodeDefinition:
    return NodeDefinition(
        type="pareto",
        version=1,
        workflow_format=2,
        category=NodeCategory.TRANSFORM,
        display_name="Pareto contributions",
        description="Rank prepared non-negative contributions and calculate population shares.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(
            PortDefinition("dataset", "Ranked contributions", PortKind.DATASET, False, None),
            PortDefinition("summary", "Pareto population", PortKind.DATASET, False, None),
        ),
        config_schema=ParetoConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=ParetoExecutor(),
    )
