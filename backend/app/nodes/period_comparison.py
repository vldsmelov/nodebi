"""Calendar-aligned lookup on prepared values; never use the last available row."""

from dataclasses import replace
from decimal import Decimal
from fractions import Fraction
from math import isfinite
from typing import Literal, Self
from uuid import UUID

import polars as pl
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.exact_formulas import round_exact
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.combine import check_size
from app.nodes.common import UnaryExecutor, input_schema, unary_definition

PeriodUnit = Literal["month", "quarter", "year"]
ComparisonRole = Literal["previous", "difference", "change", "exists"]
COMPARISON_ROLES: tuple[ComparisonRole, ...] = ("previous", "difference", "change", "exists")


class CalendarPeriodConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    date_column_id: str = Field(min_length=1)
    unit: PeriodUnit = "month"


def period_start(name: str, unit: PeriodUnit) -> pl.Expr:
    value = pl.col(name)
    month = value.dt.month().cast(pl.Int32)
    if unit == "quarter":
        month = (month - 1) // 3 * 3 + 1
    elif unit == "year":
        month = pl.lit(1)
    return pl.date(value.dt.year(), month, pl.lit(1))


class CalendarPeriodExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schema(input_schemas)
        config = CalendarPeriodConfig.model_validate(node.config)
        field = schema.by_id(config.date_column_id)
        if field.logical_type != LogicalType.DATE:
            raise ValueError(
                "Calendar periods require a date field. Convert timestamps explicitly first."
            )
        return DatasetSchema(
            tuple(
                replace(c, metadata={**c.metadata, "calendar_period": config.unit})
                if c.column_id == field.column_id
                else c
                for c in schema.columns
            )
        )

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        config = CalendarPeriodConfig.model_validate(node.config)
        name = source.schema.by_id(config.date_column_id).engine_name
        if source.frame[name].null_count():
            raise NodeExecutionError(
                "Period dates must not be empty. Correct or explicitly filter those rows."
            )
        return Dataset(
            source.frame.with_columns(period_start(name, config.unit).alias(name)),
            schema,
            source.metadata,
        )


class PeriodComparisonConfig(CalendarPeriodConfig):
    value_column_id: str = Field(min_length=1)
    partitions: list[str] = Field(default_factory=list, max_length=8)
    compare_to: Literal["previous_period", "previous_year"] = "previous_period"
    name: str = Field(default="Comparison", min_length=1, max_length=150)
    ratio_scale: int = Field(default=6, ge=0, le=18, strict=True)

    @model_validator(mode="after")
    def distinct_fields(self) -> Self:
        fields = [self.date_column_id, self.value_column_id, *self.partitions]
        if len(set(fields)) != len(fields):
            raise ValueError("Period, value and partition fields must be distinct.")
        return self


def comparison_field_id(identity: UUID, role: ComparisonRole) -> str:
    return f"comparison_{identity.hex}_{role}"


def comparison_names(config: PeriodComparisonConfig) -> list[str]:
    return [
        f"{config.name} · {suffix}"
        for suffix in ("previous", "difference", "change %", "baseline exists")
    ]


class PeriodComparisonExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schema(input_schemas)
        config = PeriodComparisonConfig.model_validate(node.config)
        date = schema.by_id(config.date_column_id)
        value = schema.by_id(config.value_column_id)
        if date.logical_type != LogicalType.DATE:
            raise ValueError(
                "Calendar periods require a date field. Convert timestamps explicitly first."
            )
        if value.logical_type not in {LogicalType.INTEGER, LogicalType.FLOAT, LogicalType.DECIMAL}:
            raise ValueError("Period comparison requires a numeric measure.")
        if value.logical_type == LogicalType.DECIMAL and (
            type(value.metadata.get("scale")) is not int or not 0 <= value.metadata["scale"] <= 38
        ):
            raise ValueError("Decimal comparison needs explicit scale metadata.")
        for key in config.partitions:
            schema.by_id(key)
        names = comparison_names(config)
        if set(names) & {c.engine_name for c in schema.columns}:
            raise ValueError(
                "Comparison output names already exist. Choose another comparison name."
            )
        exact = value.logical_type != LogicalType.FLOAT
        scale = (
            int(value.metadata.get("scale", 0)) if value.logical_type == LogicalType.DECIMAL else 0
        )
        ids = [comparison_field_id(node.id, suffix) for suffix in COMPARISON_ROLES]
        common = {
            "source_columns": [config.value_column_id],
            "comparison_period": config.compare_to,
        }
        additions = [
            replace(
                value, column_id=ids[0], engine_name=names[0], display_name=names[0], nullable=True
            ),
            ColumnSchema(
                ids[1],
                names[1],
                names[1],
                LogicalType.DECIMAL if exact else LogicalType.FLOAT,
                True,
                {**common, **({"precision": 38, "scale": scale} if exact else {})},
            ),
            ColumnSchema(
                ids[2],
                names[2],
                names[2],
                LogicalType.DECIMAL if exact else LogicalType.FLOAT,
                True,
                {
                    **common,
                    "unit": "percent",
                    **({"precision": 38, "scale": config.ratio_scale} if exact else {}),
                },
            ),
            ColumnSchema(ids[3], names[3], names[3], LogicalType.BOOLEAN, False),
        ]
        return DatasetSchema((*schema.columns, *additions))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        config = PeriodComparisonConfig.model_validate(node.config)
        check_size(source.row_count, len(schema.columns))
        date = source.schema.by_id(config.date_column_id).engine_name
        value = source.schema.by_id(config.value_column_id)
        names = comparison_names(config)
        partitions = [source.schema.by_id(key).engine_name for key in config.partitions]
        frame = source.frame
        if (
            frame[date].null_count()
            or frame.select((pl.col(date) != period_start(date, config.unit)).any()).item()
        ):
            raise NodeExecutionError(
                "Comparison dates must be non-empty calendar period starts. "
                "Add Calendar Period before aggregation."
            )
        if frame.select([*partitions, date]).is_duplicated().any():
            raise NodeExecutionError(
                "Comparison needs one row per period and partition. "
                "Aggregate or correct duplicate keys first."
            )
        if (~frame[value.engine_name].cast(pl.Float64).is_finite()).any():
            raise NodeExecutionError("Comparison values must be finite numbers or empty.")
        if any(
            source.schema.by_name(key).logical_type == LogicalType.FLOAT
            and (~frame[key].is_finite()).any()
            for key in partitions
        ):
            raise NodeExecutionError("Comparison partition keys must be finite or empty.")
        # Use integer calendar ordinals, so missing months and year boundaries are unambiguous.
        # Only the join keys/value leave Polars, not the potentially wide source table.
        rows = list(frame.select([date, *partitions, value.engine_name]).iter_rows())
        lookup = {(d.year * 12 + d.month, *parts): amount for d, *parts, amount in rows}
        offset = (
            12
            if config.compare_to == "previous_year"
            else {"month": 1, "quarter": 3, "year": 12}[config.unit]
        )
        previous: list[object] = []
        differences: list[Decimal | float | None] = []
        changes: list[Decimal | float | None] = []
        exists: list[bool] = []
        exact = value.logical_type != LogicalType.FLOAT
        scale = (
            int(value.metadata.get("scale", 0)) if value.logical_type == LogicalType.DECIMAL else 0
        )
        for d, *parts, current in rows:
            key = (d.year * 12 + d.month - offset, *parts)
            baseline = lookup.get(key)
            previous.append(baseline)
            exists.append(key in lookup)
            if current is None or baseline is None:
                differences.append(None)
                changes.append(None)
            elif exact:
                delta = Fraction(current) - Fraction(baseline)
                differences.append(round_exact(delta, 38, scale))
                changes.append(
                    round_exact(delta / Fraction(baseline) * 100, 38, config.ratio_scale)
                    if baseline
                    else None
                )
            else:
                delta_float = float(current) - float(baseline)
                change = delta_float / float(baseline) * 100 if baseline else None
                if not isfinite(delta_float) or (change is not None and not isfinite(change)):
                    raise NodeExecutionError(
                        "Comparison arithmetic overflowed. Check the measure values."
                    )
                differences.append(delta_float)
                changes.append(round(change, config.ratio_scale) if change is not None else None)
        output = frame.with_columns(
            [
                pl.Series(names[0], previous, dtype=frame[value.engine_name].dtype),
                pl.Series(
                    names[1], differences, dtype=pl.Decimal(38, scale) if exact else pl.Float64
                ),
                pl.Series(
                    names[2],
                    changes,
                    dtype=pl.Decimal(38, config.ratio_scale) if exact else pl.Float64,
                ),
                pl.Series(names[3], exists, dtype=pl.Boolean),
            ]
        )
        return Dataset(output, schema, {**source.metadata, "exact_transport": True})


def period_definitions() -> tuple[NodeDefinition, ...]:
    return (
        unary_definition(
            "calendar_period",
            "Calendar Period",
            "Replace dates with calendar period starts.",
            CalendarPeriodConfig,
            CalendarPeriodExecutor(),
        ),
        unary_definition(
            "period_comparison",
            "Period Comparison",
            "Compare prepared values with an exact calendar baseline.",
            PeriodComparisonConfig,
            PeriodComparisonExecutor(),
        ),
    )
