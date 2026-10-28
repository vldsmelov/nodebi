"""Full-population Tukey summaries and outliers from a single input materialization."""

import json
import math
import uuid
from collections import Counter
from dataclasses import replace
from fractions import Fraction
from typing import Any

import polars as pl
from pydantic import BaseModel, ConfigDict, Field

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


class BoxPlotStatsConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value_column_id: str = Field(min_length=1)
    group_column_id: str | None = Field(default=None, min_length=1)


STATISTICS = ("minimum", "lower_whisker", "q1", "median", "q3", "upper_whisker", "maximum")
LABELS = {
    "minimum": "Minimum",
    "lower_whisker": "Lower whisker",
    "q1": "First quartile",
    "median": "Median",
    "q3": "Third quartile",
    "upper_whisker": "Upper whisker",
    "maximum": "Maximum",
}


def fields(node: NodeInstance, source: DatasetSchema) -> tuple[ColumnSchema, ColumnSchema | None]:
    config = BoxPlotStatsConfig.model_validate(node.config)
    try:
        value = source.by_id(config.value_column_id)
        group = source.by_id(config.group_column_id) if config.group_column_id else None
    except StopIteration as exc:
        raise ValueConnectionError(
            "A selected statistical field is unavailable.", field="config"
        ) from exc
    if value.logical_type not in {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}:
        raise ValueConnectionError(
            "Choose a numeric field for the distribution.", field="config.value_column_id"
        )
    if group and (
        group.column_id == value.column_id
        or group.logical_type
        not in {LogicalType.STRING, LogicalType.INTEGER, LogicalType.BOOLEAN, LogicalType.DATE}
    ):
        raise ValueConnectionError(
            "Choose a separate string, integer, boolean or date grouping field.",
            field="config.group_column_id",
        )
    if value.logical_type == LogicalType.DECIMAL:
        scale = value.metadata.get("scale")
        if type(scale) is not int or not 0 <= scale <= 36:
            raise ValueConnectionError(
                "Exact quartiles require decimal scale from 0 to 36. Rescale explicitly upstream.",
                field="config.value_column_id",
            )
    return value, group


def schemas(node: NodeInstance, source: DatasetSchema) -> dict[str, DatasetSchema]:
    value, group = fields(node, source)

    def col(
        name: str,
        label: str,
        kind: LogicalType,
        nullable: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> ColumnSchema:
        return ColumnSchema(
            f"box_{node.id.hex}_{name}", name, label, kind, nullable, metadata or {}
        )

    common = [col("group_id", "Group identity", LogicalType.STRING)]
    common.append(
        replace(
            group,
            column_id=f"box_{node.id.hex}_group",
            engine_name="group",
            metadata={**group.metadata, "source_columns": [group.column_id]},
        )
        if group
        else col("group", "Group", LogicalType.STRING)
    )
    kind = LogicalType.FLOAT if value.logical_type == LogicalType.FLOAT else LogicalType.DECIMAL
    metadata = {**value.metadata, "source_columns": [value.column_id], "quantile_method": "linear"}
    if kind == LogicalType.DECIMAL:
        metadata.update(
            precision=38,
            scale=(int(value.metadata["scale"]) if value.logical_type == LogicalType.DECIMAL else 0)
            + 2,
        )
    summary = [
        *common,
        col("count", "Observations", LogicalType.INTEGER),
        col("missing_count", "Missing values", LogicalType.INTEGER),
    ]
    summary.extend(col(name, LABELS[name], kind, True, metadata) for name in STATISTICS)
    summary.append(col("outlier_count", "Outlier count", LogicalType.INTEGER))
    outliers = [
        *common,
        col("point_id", "Point identity", LogicalType.STRING),
        replace(
            value,
            column_id=f"box_{node.id.hex}_value",
            engine_name="value",
            nullable=False,
            metadata={**value.metadata, "source_columns": [value.column_id]},
        ),
    ]
    return {"dataset": DatasetSchema(tuple(summary)), "outliers": DatasetSchema(tuple(outliers))}


def quantile(values: list[Fraction], numerator: int) -> Fraction:
    position = Fraction((len(values) - 1) * numerator, 4)
    lower = position.numerator // position.denominator
    weight = position - lower
    return values[lower] * (1 - weight) + values[min(lower + 1, len(values) - 1)] * weight


class BoxPlotStatsExecutor(TypedNodeExecutor):
    def infer_outputs(
        self, node: NodeInstance, inputs: dict[str, ValueSchema], context: ExecutionContext
    ) -> dict[str, ValueSchema]:
        source = inputs.get("input")
        if source is None or source.table is None or source.kind != "dataset":
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        return {
            port: ValueSchema(
                "dataset", table=schema, context=RowContext(context.workflow_id, node.id, port)
            )
            for port, schema in schemas(node, source.table).items()
        }

    def execute_outputs(
        self, node: NodeInstance, inputs: dict[str, ExecutionValue], context: ExecutionContext
    ) -> dict[str, ExecutionValue]:
        table = inputs.get("input")
        if not isinstance(table, TableValue):
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        source = table.dataset
        output_schemas = schemas(node, source.schema)
        value, group = fields(node, source.schema)
        check_size(source.row_count, 2 if group else 1)
        values = source.frame[value.engine_name]
        if value.logical_type == LogicalType.FLOAT and not values.drop_nulls().is_finite().all():
            raise ValueConnectionError(
                "Distribution values must be finite numbers or empty.",
                field="config.value_column_id",
            )
        if group and source.frame[group.engine_name].n_unique() > 2000:
            raise ValueConnectionError(
                "Distribution supports up to 2000 groups. Prepare coarser groups upstream.",
                field="config.group_column_id",
            )
        frame = source.frame.select(
            pl.col(value.engine_name).alias("value"),
            pl.col(group.engine_name).alias("group")
            if group
            else pl.lit("All rows").alias("group"),
        )
        partitions = frame.partition_by("group", maintain_order=True) if group else [frame]
        summary_rows, outlier_rows = [], []
        for partition in partitions:
            key = partition["group"][0] if partition.height else "All rows"
            identity = str(
                uuid.uuid5(
                    node.id,
                    json.dumps(
                        [group.logical_type.value if group else "all", key],
                        default=str,
                        ensure_ascii=False,
                    ),
                )
            )
            original = partition["value"].drop_nulls().sort().to_list()
            rational = [Fraction(v) for v in original]
            count = len(original)
            row: list[Any] = [identity, key, count, partition.height - count]
            stats: list[Fraction | None] = [None] * len(STATISTICS)
            indices = []
            if rational:
                q1, median, q3 = (quantile(rational, q) for q in (1, 2, 3))
                fence_low, fence_high = (
                    q1 - Fraction(3, 2) * (q3 - q1),
                    q3 + Fraction(3, 2) * (q3 - q1),
                )
                inside = [v for v in rational if fence_low <= v <= fence_high]
                stats = [rational[0], inside[0], q1, median, q3, inside[-1], rational[-1]]
                indices = [i for i, v in enumerate(rational) if v < fence_low or v > fence_high]
            if value.logical_type == LogicalType.FLOAT:
                converted = [float(v) if v is not None else None for v in stats]
                if any(v is not None and not math.isfinite(v) for v in converted):
                    raise ValueConnectionError(
                        "Distribution statistics overflowed the numeric range."
                    )
                row.extend(converted)
            else:
                try:
                    decimals = [
                        round_exact(
                            v, 38, output_schemas["dataset"].by_name("q1").metadata["scale"]
                        )
                        for v in stats
                    ]
                    if any(
                        v is not None and Fraction(d) != v
                        for v, d in zip(stats, decimals, strict=True)
                        if d is not None
                    ):
                        raise FormulaValidationError("Inexact statistics")
                except FormulaValidationError as exc:
                    raise ValueConnectionError(
                        "Exact statistics exceed decimal precision. Rescale explicitly upstream.",
                        field="config.value_column_id",
                    ) from exc
                row.extend(decimals)
            row.append(len(indices))
            summary_rows.append(row)
            occurrences: Counter[Fraction] = Counter()
            for i in indices:
                number = rational[i]
                occurrences[number] += 1
                point_id = str(uuid.uuid5(node.id, f"{identity}:{number}:{occurrences[number]}"))
                outlier_rows.append([identity, key, point_id, original[i]])
        result: dict[str, ExecutionValue] = {}
        for port, rows in (("dataset", summary_rows), ("outliers", outlier_rows)):
            schema = output_schemas[port]
            check_size(len(rows), len(schema.columns))
            dtypes = {}
            for column in schema.columns:
                if column.engine_name == "group" and group:
                    dtype = source.frame.schema[group.engine_name]
                elif column.engine_name == "value":
                    dtype = values.dtype
                elif column.logical_type == LogicalType.DECIMAL:
                    dtype = pl.Decimal(38, column.metadata["scale"])
                elif column.logical_type == LogicalType.FLOAT:
                    dtype = pl.Float64()
                elif column.logical_type == LogicalType.INTEGER:
                    dtype = pl.Int64()
                else:
                    dtype = pl.String()
                dtypes[column.engine_name] = dtype
            output = Dataset(
                pl.DataFrame(rows, schema=dtypes, orient="row"),
                schema,
                {
                    "exact_transport": True,
                    "statistics": {
                        "method": "linear",
                        "whisker_iqr_multiplier": "1.5",
                        "input_rows": source.row_count,
                    },
                },
            )
            result[port] = TableValue(RowContext(context.workflow_id, node.id, port), output)
        return result


def boxplot_stats_definition() -> NodeDefinition:
    return NodeDefinition(
        type="boxplot_stats",
        version=1,
        workflow_format=2,
        category=NodeCategory.TRANSFORM,
        display_name="Box-plot statistics",
        description="Full-data linear quartiles, 1.5 IQR whiskers and separate outliers. "
        "Empty values are counted, not treated as zero.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(
            PortDefinition("dataset", "Distribution summary", PortKind.DATASET, False, None),
            PortDefinition("outliers", "Outliers", PortKind.DATASET, False, None),
        ),
        config_schema=BoxPlotStatsConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=BoxPlotStatsExecutor(),
    )
