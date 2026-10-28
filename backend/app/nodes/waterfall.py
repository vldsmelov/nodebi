"""Ordered signed contributions with explicit checkpoints; no browser accumulation."""

import json
import math
import uuid
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

MAX_STEPS = 2000
KINDS = ("initial", "change", "subtotal", "total")


class WaterfallConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category_column_id: str = Field(min_length=1)
    value_column_id: str = Field(min_length=1)
    kind_column_id: str | None = Field(default=None, min_length=1)
    order_column_id: str | None = Field(default=None, min_length=1, exclude_if=lambda v: v is None)
    initial_marker: str = Field(default="initial", min_length=1, max_length=200)
    change_marker: str = Field(default="change", min_length=1, max_length=200)
    subtotal_marker: str = Field(default="subtotal", min_length=1, max_length=200)
    total_marker: str = Field(default="total", min_length=1, max_length=200)
    append_total: bool = False
    total_label: str = Field(default="Total", min_length=1, max_length=200)

    @model_validator(mode="after")
    def distinct_fields_and_markers(self) -> "WaterfallConfig":
        fields = [self.category_column_id, self.value_column_id]
        if self.kind_column_id:
            fields.append(self.kind_column_id)
        if len(set(fields)) != len(fields):
            raise ValueError("Choose separate waterfall label, value and row-type fields.")
        markers = [getattr(self, f"{kind}_marker") for kind in KINDS]
        if len(set(markers)) != len(markers) or any(not marker.strip() for marker in markers):
            raise ValueError("Waterfall row-type markers must be distinct non-empty text.")
        if not self.total_label.strip():
            raise ValueError("Enter a non-empty final total label.")
        return self


def fields(
    node: NodeInstance, source: DatasetSchema
) -> tuple[ColumnSchema, ColumnSchema, ColumnSchema | None]:
    config = WaterfallConfig.model_validate(node.config)
    try:
        category = source.by_id(config.category_column_id)
        value = source.by_id(config.value_column_id)
        kind = source.by_id(config.kind_column_id) if config.kind_column_id else None
        order = source.by_id(config.order_column_id) if config.order_column_id else None
    except StopIteration as exc:
        raise ValueConnectionError("A selected waterfall field is unavailable.") from exc
    if category.logical_type not in {
        LogicalType.STRING,
        LogicalType.INTEGER,
        LogicalType.DATE,
        LogicalType.BOOLEAN,
    }:
        raise ValueConnectionError(
            "Waterfall labels require text, integer, boolean or date fields."
        )
    if value.logical_type not in {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}:
        raise ValueConnectionError("Choose a numeric waterfall value field.")
    if kind and kind.logical_type != LogicalType.STRING:
        raise ValueConnectionError("Waterfall row types require a text field.")
    if order and order.logical_type not in {
        LogicalType.INTEGER,
        LogicalType.DECIMAL,
        LogicalType.DATE,
        LogicalType.DATETIME,
    }:
        raise ValueConnectionError(
            "Waterfall order requires an integer, decimal, date or datetime field."
        )
    if value.logical_type == LogicalType.DECIMAL:
        scale = value.metadata.get("scale")
        if type(scale) is not int or not 0 <= scale <= 38:
            raise ValueConnectionError(
                "Waterfall decimal values require an explicit scale from 0 to 38."
            )
    return category, value, kind


def waterfall_schema(node: NodeInstance, source: DatasetSchema) -> DatasetSchema:
    category, value, kind = fields(node, source)
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
        name: str, label: str, dtype: LogicalType, meta: dict[str, Any] | None = None
    ) -> ColumnSchema:
        return ColumnSchema(f"water_{node.id.hex}_{name}", name, label, dtype, False, meta or {})

    return DatasetSchema(
        (
            col("step_id", "Step identity", LogicalType.STRING),
            col("step_index", "Step number", LogicalType.INTEGER),
            col(
                "category",
                category.display_name,
                LogicalType.STRING,
                {
                    "source_columns": [category.column_id],
                    "source_logical_type": category.logical_type.value,
                },
            ),
            col(
                "kind",
                "Step type",
                LogicalType.STRING,
                {"source_columns": [kind.column_id]} if kind else {},
            ),
            col("value", "Contribution or total", number_type, metadata),
            col("start", "Bar start", number_type, metadata),
            col("end", "Bar end", number_type, metadata),
            col("balance", "Running balance", number_type, metadata),
            col("generated", "Generated total", LogicalType.BOOLEAN),
        )
    )


def numeric(value: Fraction, column: ColumnSchema) -> Any:
    if column.logical_type == LogicalType.FLOAT:
        try:
            result = float(value)
        except OverflowError as exc:
            raise ValueConnectionError("Waterfall balance exceeds the numeric range.") from exc
        if not math.isfinite(result):
            raise ValueConnectionError("Waterfall balance exceeds the numeric range.")
        return result
    try:
        exact = round_exact(value, 38, column.metadata["scale"])
    except FormulaValidationError as exc:
        raise ValueConnectionError(
            "Waterfall balance exceeds decimal precision. Rescale explicitly upstream."
        ) from exc
    # The input's scale must accommodate every sum exactly. Never silently quantize schema drift.
    assert exact is not None
    if Fraction(exact) != value:
        raise ValueConnectionError("Waterfall values do not match their declared decimal scale.")
    return exact


class WaterfallExecutor(TypedNodeExecutor):
    def infer_outputs(
        self, node: NodeInstance, inputs: dict[str, ValueSchema], context: ExecutionContext
    ) -> dict[str, ValueSchema]:
        source = inputs.get("input")
        if source is None or source.kind != "dataset" or source.table is None:
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        return {
            "dataset": ValueSchema(
                "dataset",
                table=waterfall_schema(node, source.table),
                context=RowContext(context.workflow_id, node.id, "dataset"),
            )
        }

    def execute_outputs(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        table = inputs.get("input")
        if not isinstance(table, TableValue):
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        source = table.dataset
        config = WaterfallConfig.model_validate(node.config)
        category, value, kind_column = fields(node, source.schema)
        schema = waterfall_schema(node, source.schema)
        keys = source.frame[category.engine_name]
        if keys.null_count() or (
            category.logical_type == LogicalType.STRING and keys.str.strip_chars().eq("").any()
        ):
            raise ValueConnectionError("Waterfall steps require non-empty labels.")
        if keys.n_unique() != source.row_count:
            raise ValueConnectionError(
                "Waterfall needs one row per label. Group or rename steps upstream."
            )
        if source.row_count + int(config.append_total and source.row_count > 0) > MAX_STEPS:
            raise ValueConnectionError(
                "Waterfall supports up to 2000 steps. Group or filter the input upstream."
            )
        frame = source.frame
        if config.order_column_id:
            order = source.schema.by_id(config.order_column_id)
            order_values = frame[order.engine_name]
            if order_values.null_count() or order_values.n_unique() != source.row_count:
                raise ValueConnectionError("Waterfall order values must be unique and non-empty.")
            frame = frame.sort(order.engine_name)
            keys = frame[category.engine_name]
        values = source.frame[value.engine_name]
        if value.logical_type == LogicalType.FLOAT and not values.drop_nulls().is_finite().all():
            raise ValueConnectionError("Waterfall values must be finite numbers or empty totals.")
        labels = keys.cast(pl.String).to_list()
        if config.append_total and config.total_label in labels:
            raise ValueConnectionError(
                "The generated total label must differ from every input label."
            )
        markers = {getattr(config, f"{kind}_marker"): kind for kind in KINDS}
        number_column = schema.by_name("value")
        selected = [category.engine_name, value.engine_name]
        if kind_column:
            selected.append(kind_column.engine_name)
        rows = []
        balance = Fraction(0)
        for index, raw_row in enumerate(frame.select(selected).iter_rows()):
            key, raw = raw_row[:2]
            kind = markers.get(raw_row[2]) if kind_column else "change"
            if kind is None:
                raise ValueConnectionError(
                    "A waterfall row type is empty or does not match the configured markers."
                )
            amount = Fraction(str(raw)) if raw is not None else None
            if kind in {"initial", "change"} and amount is None:
                raise ValueConnectionError(
                    "Waterfall contributions and initial balances cannot be empty."
                )
            start = balance
            if kind == "initial":
                if index != 0:
                    raise ValueConnectionError(
                        "An initial waterfall balance is allowed only in the first row."
                    )
                assert amount is not None
                start, balance = Fraction(0), amount
            elif kind == "change":
                assert amount is not None
                balance += amount
            else:
                if index == 0:
                    raise ValueConnectionError(
                        "A waterfall total requires an earlier contribution or initial balance."
                    )
                if kind == "total" and (index != source.row_count - 1 or config.append_total):
                    raise ValueConnectionError(
                        "The final waterfall total must be last and cannot be appended twice."
                    )
                if amount is not None and amount != balance:
                    raise ValueConnectionError(
                        "A supplied waterfall total differs from the running balance. "
                        "Correct it or leave the total value empty."
                    )
                start, amount = Fraction(0), balance
            assert amount is not None
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
                    labels[index],
                    kind,
                    numeric(amount, number_column),
                    numeric(start, number_column),
                    numeric(balance, number_column),
                    numeric(balance, number_column),
                    False,
                ]
            )
        if config.append_total and rows:
            exact = numeric(balance, number_column)
            rows.append(
                [
                    str(uuid.uuid5(node.id, "generated:total")),
                    len(rows) + 1,
                    config.total_label,
                    "total",
                    exact,
                    numeric(Fraction(0), number_column),
                    exact,
                    exact,
                    True,
                ]
            )
        dtypes = {
            column.engine_name: pl.Decimal(38, column.metadata["scale"])
            if column.logical_type == LogicalType.DECIMAL
            else pl.Float64
            if column.logical_type == LogicalType.FLOAT
            else pl.Int64
            if column.logical_type == LogicalType.INTEGER
            else pl.Boolean
            if column.logical_type == LogicalType.BOOLEAN
            else pl.String
            for column in schema.columns
        }
        return {
            "dataset": TableValue(
                RowContext(context.workflow_id, node.id, "dataset"),
                Dataset(
                    pl.DataFrame(rows, schema=dtypes, orient="row"),
                    schema,
                    {
                        "exact_transport": True,
                        "statistics": {
                            "input_rows": source.row_count,
                            "generated_total": bool(config.append_total and rows),
                            "order": "ascending" if config.order_column_id else "input",
                        },
                    },
                ),
            )
        }


def waterfall_definition() -> NodeDefinition:
    return NodeDefinition(
        type="waterfall_steps",
        version=1,
        workflow_format=2,
        category=NodeCategory.TRANSFORM,
        display_name="Waterfall steps",
        description="Prepare ordered signed contributions and explicit totals "
        "without double-counting.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(PortDefinition("dataset", "Waterfall steps", PortKind.DATASET, False, None),),
        config_schema=WaterfallConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=WaterfallExecutor(),
    )
