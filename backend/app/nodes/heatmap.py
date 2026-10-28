"""Explicit full-data cell aggregation; absent pairs never become measured zeroes."""

import json
import math
import uuid
from dataclasses import dataclass, replace
from fractions import Fraction
from typing import Any, Literal

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
from app.nodes.combine import check_size

MAX_AXIS = 200
MAX_CELLS = 10_000


class HeatmapConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x_column_id: str = Field(min_length=1)
    y_column_id: str = Field(min_length=1)
    value_column_id: str = Field(min_length=1)
    # No default: summing repeated business measures is not always meaningful.
    aggregation: Literal["sum", "average", "min", "max", "count"]
    average_scale: int = Field(default=6, ge=0, le=18, strict=True)

    @model_validator(mode="after")
    def distinct_fields(self) -> "HeatmapConfig":
        if len({self.x_column_id, self.y_column_id, self.value_column_id}) != 3:
            raise ValueError("Choose two separate heatmap dimensions and a separate numeric field.")
        return self


def fields(node: NodeInstance, source: DatasetSchema) -> tuple[ColumnSchema, ...]:
    config = HeatmapConfig.model_validate(node.config)
    try:
        x, y, value = [
            source.by_id(key)
            for key in (config.x_column_id, config.y_column_id, config.value_column_id)
        ]
    except StopIteration as exc:
        raise ValueConnectionError("A selected heatmap field is unavailable.") from exc
    dimensions = {LogicalType.STRING, LogicalType.INTEGER, LogicalType.BOOLEAN, LogicalType.DATE}
    if x.logical_type not in dimensions or y.logical_type not in dimensions:
        raise ValueConnectionError(
            "Heatmap dimensions must be text, integer, boolean or date fields."
        )
    if value.logical_type not in {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}:
        raise ValueConnectionError("Choose a numeric heatmap value field.")
    if value.logical_type == LogicalType.DECIMAL:
        scale = value.metadata.get("scale")
        if type(scale) is not int or not 0 <= scale <= 38:
            raise ValueConnectionError(
                "Heatmap decimal values require an explicit scale from 0 to 38."
            )
    return x, y, value


def heatmap_schema(node: NodeInstance, source: DatasetSchema) -> DatasetSchema:
    config = HeatmapConfig.model_validate(node.config)
    x, y, value = fields(node, source)

    def col(name: str, label: str, kind: LogicalType) -> ColumnSchema:
        return ColumnSchema(f"heat_{node.id.hex}_{name}", name, label, kind, False)

    def axis(column: ColumnSchema, name: str) -> ColumnSchema:
        return replace(
            column,
            column_id=f"heat_{node.id.hex}_{name}",
            engine_name=name,
            metadata={**column.metadata, "source_columns": [column.column_id]},
        )

    kind = (
        LogicalType.INTEGER
        if config.aggregation == "count"
        else LogicalType.FLOAT
        if value.logical_type == LogicalType.FLOAT
        else LogicalType.DECIMAL
    )
    metadata: dict[str, Any] = {
        **(value.metadata if config.aggregation != "count" else {}),
        "source_columns": [value.column_id],
        "aggregation": config.aggregation,
    }
    if kind == LogicalType.DECIMAL:
        metadata.update(
            precision=38,
            scale=config.average_scale
            if config.aggregation == "average"
            else value.metadata["scale"]
            if value.logical_type == LogicalType.DECIMAL
            else 0,
            rounding="half_even",
        )
    return DatasetSchema(
        (
            col("cell_id", "Cell identity", LogicalType.STRING),
            col("x_id", "X category identity", LogicalType.STRING),
            col("y_id", "Y category identity", LogicalType.STRING),
            axis(x, "x"),
            axis(y, "y"),
            ColumnSchema(
                f"heat_{node.id.hex}_value", "value", value.display_name, kind, True, metadata
            ),
            col("present", "Cell has source rows", LogicalType.BOOLEAN),
            col("row_count", "Source rows", LogicalType.INTEGER),
            col("valid_count", "Numeric observations", LogicalType.INTEGER),
            col("missing_count", "Missing values", LogicalType.INTEGER),
        )
    )


@dataclass
class Cell:
    rows: int = 0
    valid: int = 0
    value: Fraction | None = None

    def add(self, raw: Any, operation: str) -> None:
        self.rows += 1
        if raw is None:
            return
        self.valid += 1
        if operation == "count":
            return
        number = Fraction(raw)
        if self.value is None:
            self.value = number
        elif operation == "min":
            self.value = min(self.value, number)
        elif operation == "max":
            self.value = max(self.value, number)
        else:
            self.value += number


class HeatmapExecutor(TypedNodeExecutor):
    def infer_outputs(
        self, node: NodeInstance, inputs: dict[str, ValueSchema], context: ExecutionContext
    ) -> dict[str, ValueSchema]:
        source = inputs.get("input")
        if source is None or source.kind != "dataset" or source.table is None:
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        return {
            "dataset": ValueSchema(
                "dataset",
                table=heatmap_schema(node, source.table),
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
        config = HeatmapConfig.model_validate(node.config)
        schema = heatmap_schema(node, source.schema)
        x, y, value = fields(node, source.schema)
        check_size(source.row_count, 3)
        counts = [source.frame[c.engine_name].n_unique() for c in (x, y)]
        if max(counts) > MAX_AXIS or counts[0] * counts[1] > MAX_CELLS:
            raise ValueConnectionError(
                "Heatmap supports up to 200 categories per axis and 10000 cells. "
                "Filter or group dimensions upstream."
            )
        values = source.frame[value.engine_name]
        if value.logical_type == LogicalType.FLOAT and not values.drop_nulls().is_finite().all():
            raise ValueConnectionError("Heatmap values must be finite numbers or empty.")
        # Only the three selected fields leave Polars; accumulation does not retain raw groups.
        cells: dict[tuple[Any, Any], Cell] = {}
        for a, b, raw in source.frame.select(
            x.engine_name, y.engine_name, value.engine_name
        ).iter_rows():
            key = (a, b)
            if key not in cells:
                cells[key] = Cell()
            cells[key].add(raw, config.aggregation)

        def domain(column: ColumnSchema, axis: str) -> list[tuple[Any, str]]:
            keys = source.frame[column.engine_name].unique().sort(nulls_last=True).to_list()
            return [
                (
                    key,
                    str(
                        uuid.uuid5(
                            node.id,
                            json.dumps(
                                [axis, column.column_id, column.logical_type.value, key],
                                default=str,
                                ensure_ascii=False,
                            ),
                        )
                    ),
                )
                for key in keys
            ]

        rows = []
        value_column = schema.by_name("value")
        x_domain, y_domain = domain(x, "x"), domain(y, "y")
        for b, y_id in y_domain:
            for a, x_id in x_domain:
                cell = cells.get((a, b))
                rational = cell.value if cell else None
                if cell and rational is not None and config.aggregation == "average":
                    rational /= cell.valid
                converted: Any = None
                if config.aggregation == "count":
                    converted = cell.valid if cell else None
                elif value_column.logical_type == LogicalType.FLOAT:
                    try:
                        converted = float(rational) if rational is not None else None
                    except OverflowError as exc:
                        raise ValueConnectionError(
                            "Heatmap aggregation exceeds the numeric range."
                        ) from exc
                    if converted is not None and not math.isfinite(converted):
                        raise ValueConnectionError("Heatmap aggregation exceeds the numeric range.")
                else:
                    try:
                        converted = round_exact(rational, 38, value_column.metadata["scale"])
                    except FormulaValidationError as exc:
                        raise ValueConnectionError(
                            "Heatmap aggregation exceeds decimal precision. "
                            "Rescale explicitly upstream."
                        ) from exc
                rows.append(
                    [
                        str(uuid.uuid5(node.id, f"{x_id}:{y_id}")),
                        x_id,
                        y_id,
                        a,
                        b,
                        converted,
                        cell is not None,
                        cell.rows if cell else 0,
                        cell.valid if cell else 0,
                        cell.rows - cell.valid if cell else 0,
                    ]
                )
        dtypes = {
            c.engine_name: source.frame.schema[x.engine_name]
            if c.engine_name == "x"
            else source.frame.schema[y.engine_name]
            if c.engine_name == "y"
            else pl.Decimal(38, c.metadata["scale"])
            if c.logical_type == LogicalType.DECIMAL
            else pl.Float64
            if c.logical_type == LogicalType.FLOAT
            else pl.Int64
            if c.logical_type == LogicalType.INTEGER
            else pl.Boolean
            if c.logical_type == LogicalType.BOOLEAN
            else pl.String
            for c in schema.columns
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
                            "aggregation": config.aggregation,
                            "input_rows": source.row_count,
                            "x_categories": counts[0],
                            "y_categories": counts[1],
                        },
                    },
                ),
            )
        }


def heatmap_definition() -> NodeDefinition:
    return NodeDefinition(
        type="heatmap_stats",
        version=1,
        workflow_format=2,
        category=NodeCategory.TRANSFORM,
        display_name="Heatmap cells",
        description="Aggregate two dimensions with an explicit operation; "
        "distinguish absent cells, empty values and zero.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(PortDefinition("dataset", "Heatmap cells", PortKind.DATASET, False, None),),
        config_schema=HeatmapConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=HeatmapExecutor(),
    )
