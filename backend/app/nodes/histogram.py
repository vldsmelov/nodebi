"""Full-population, equal-width histogram with exact decimal/integer bin assignment."""

import math
import re
import uuid
from decimal import Decimal
from fractions import Fraction
from typing import Any

import polars as pl
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
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


def boundary(value: str) -> Fraction:
    # Bounded plain decimal spelling: no exponent explosions or arbitrary expressions.
    if not re.fullmatch(r"[+-]?(?:\d{1,38}(?:\.\d{1,38})?|\.\d{1,38})", value):
        raise ValueError(
            "Enter histogram bounds as decimal numbers with at most 38 digits per part."
        )
    return Fraction(Decimal(value))


class HistogramConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value_column_id: str = Field(min_length=1)
    bin_count: int = Field(default=20, ge=1, le=200, strict=True)
    range_min: str | None = Field(default=None, min_length=1, max_length=78)
    range_max: str | None = Field(default=None, min_length=1, max_length=78)

    @model_validator(mode="after")
    def valid_range(self) -> "HistogramConfig":
        if (self.range_min is None) != (self.range_max is None):
            raise ValueError("Set both histogram bounds or use the automatic range.")
        if (
            self.range_min is not None
            and self.range_max is not None
            and boundary(self.range_min) >= boundary(self.range_max)
        ):
            raise ValueError("The histogram upper bound must be greater than its lower bound.")
        return self


def exact_text(value: Fraction) -> str:
    """Finite decimals when possible; an exact fraction for repeating interval boundaries."""
    denominator = value.denominator
    twos = fives = 0
    while denominator % 2 == 0:
        denominator //= 2
        twos += 1
    while denominator % 5 == 0:
        denominator //= 5
        fives += 1
    if denominator != 1:
        return f"{value.numerator}/{value.denominator}"
    scale = max(twos, fives)
    integer = value.numerator * 2 ** (scale - twos) * 5 ** (scale - fives)
    sign = "-" if integer < 0 else ""
    digits = str(abs(integer)).zfill(scale + 1)
    if not scale:
        return sign + digits
    return (sign + digits[:-scale] + "." + digits[-scale:]).rstrip("0").rstrip(".")


def histogram_schemas(node: NodeInstance, source: DatasetSchema) -> dict[str, DatasetSchema]:
    config = HistogramConfig.model_validate(node.config)
    try:
        column = source.by_id(config.value_column_id)
    except StopIteration as exc:
        raise ValueConnectionError("Choose an available numeric histogram field.") from exc
    if column.logical_type not in {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}:
        raise ValueConnectionError("Choose an available numeric histogram field.")

    def col(name: str, label: str, kind: LogicalType, nullable: bool = False) -> ColumnSchema:
        return ColumnSchema(
            f"hist_{node.id.hex}_{name}",
            name,
            label,
            kind,
            nullable,
            {
                "source_columns": [column.column_id],
                "currency": column.metadata.get("currency"),
                "unit": column.metadata.get("unit"),
            }
            if name in {"lower", "upper", "range_min", "range_max"}
            else {},
        )

    return {
        "dataset": DatasetSchema(
            (
                col("bin_id", "Interval identity", LogicalType.STRING),
                col("bin_index", "Interval number", LogicalType.INTEGER),
                col("lower", "Lower bound (exact)", LogicalType.STRING),
                col("upper", "Upper bound (exact)", LogicalType.STRING),
                col("upper_inclusive", "Upper bound included", LogicalType.BOOLEAN),
                col("interval", "Interval", LogicalType.STRING),
                col("count", "Observations", LogicalType.INTEGER),
            )
        ),
        "summary": DatasetSchema(
            tuple(
                col(name, label, LogicalType.INTEGER)
                for name, label in (
                    ("input_count", "Input rows"),
                    ("valid_count", "Numeric observations"),
                    ("missing_count", "Missing values"),
                    ("included_count", "Included observations"),
                    ("below_count", "Below range"),
                    ("above_count", "Above range"),
                    ("bin_count", "Interval count"),
                )
            )
            + (
                col("range_min", "Range minimum (exact)", LogicalType.STRING, True),
                col("range_max", "Range maximum (exact)", LogicalType.STRING, True),
            )
        ),
    }


class HistogramExecutor(TypedNodeExecutor):
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
            for port, schema in histogram_schemas(node, source.table).items()
        }

    def execute_outputs(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        table = inputs.get("input")
        if not isinstance(table, TableValue):
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        source = table.dataset
        schemas = histogram_schemas(node, source.schema)
        config = HistogramConfig.model_validate(node.config)
        check_size(source.row_count, 1)
        values = source.frame[source.schema.by_id(config.value_column_id).engine_name]
        if values.dtype.is_float() and not values.drop_nulls().is_finite().all():
            raise ValueConnectionError("Histogram observations must be finite numbers or empty.")
        # Float64 values remain approximate; use their shortest round-trip decimal spelling.
        # Exact integer/decimal input never crosses a floating-point conversion.
        numbers = [
            Fraction(str(value)) if isinstance(value, float) else Fraction(value)
            for value in values.drop_nulls().to_list()
        ]
        lower = (
            boundary(config.range_min)
            if config.range_min is not None
            else min(numbers, default=None)
        )
        upper = (
            boundary(config.range_max)
            if config.range_max is not None
            else max(numbers, default=None)
        )
        bins: list[dict[str, Any]] = []
        below = above = 0
        if lower is not None and upper is not None:
            count = 1 if lower == upper else config.bin_count
            width = (upper - lower) / count
            counts = [0] * count
            for value in numbers:
                if value < lower:
                    below += 1
                elif value > upper:
                    above += 1
                else:
                    index = 0 if width == 0 else min(math.floor((value - lower) / width), count - 1)
                    counts[index] += 1
            for index, size in enumerate(counts):
                lo, hi = exact_text(lower + index * width), exact_text(lower + (index + 1) * width)
                inclusive = index == count - 1
                bins.append(
                    {
                        "bin_id": str(uuid.uuid5(node.id, f"{lo}|{hi}|{inclusive}")),
                        "bin_index": index + 1,
                        "lower": lo,
                        "upper": hi,
                        "upper_inclusive": inclusive,
                        "interval": f"[{lo}; {hi}{']' if inclusive else ')'}",
                        "count": size,
                    }
                )
        summary = [
            {
                "input_count": source.row_count,
                "valid_count": len(numbers),
                "missing_count": source.row_count - len(numbers),
                "included_count": len(numbers) - below - above,
                "below_count": below,
                "above_count": above,
                "bin_count": len(bins),
                "range_min": exact_text(lower) if lower is not None else None,
                "range_max": exact_text(upper) if upper is not None else None,
            }
        ]
        return {
            port: TableValue(
                RowContext(context.workflow_id, node.id, port),
                Dataset(
                    pl.DataFrame(
                        rows,
                        schema={
                            column.engine_name: {
                                LogicalType.STRING: pl.String,
                                LogicalType.INTEGER: pl.Int64,
                                LogicalType.BOOLEAN: pl.Boolean,
                            }[column.logical_type]
                            for column in schemas[port].columns
                        },
                    ),
                    schemas[port],
                    {
                        "exact_transport": True,
                        "statistics": {"method": "equal_width", "input_rows": source.row_count},
                    },
                ),
            )
            for port, rows in (("dataset", bins), ("summary", summary))
        }


def histogram_definition() -> NodeDefinition:
    return NodeDefinition(
        type="histogram",
        version=1,
        workflow_format=2,
        category=NodeCategory.TRANSFORM,
        display_name="Histogram statistics",
        description="Full-data counts in equal-width intervals. "
        "Missing and out-of-range values are counted separately.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(
            PortDefinition("dataset", "Histogram intervals", PortKind.DATASET, False, None),
            PortDefinition("summary", "Histogram summary", PortKind.DATASET, False, None),
        ),
        config_schema=HistogramConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=HistogramExecutor(),
    )
