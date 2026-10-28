"""Hierarchical table preparation. Totals merge unrounded observation states, never rows."""

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

Operation = Literal["sum", "average", "min", "max", "count", "count_rows", "ratio_of_sums"]
NUMERIC = {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}
DIMENSIONS = {LogicalType.STRING, LogicalType.INTEGER, LogicalType.BOOLEAN, LogicalType.DATE}
MAX_ROWS = 20_000


class RollupMeasure(BaseModel):
    model_config = ConfigDict(extra="forbid")
    output_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    operation: Operation
    column_id: str | None = Field(default=None, min_length=1)
    denominator_column_id: str | None = Field(default=None, min_length=1)
    scale: int = Field(default=6, ge=0, le=18, strict=True)

    @model_validator(mode="after")
    def explicit_fields(self) -> "RollupMeasure":
        if not self.name.strip():
            raise ValueError("Enter a rollup measure name.")
        if (self.column_id is None) != (self.operation == "count_rows"):
            raise ValueError("Choose a rollup value field, except for counting source rows.")
        if (self.denominator_column_id is not None) != (self.operation == "ratio_of_sums"):
            raise ValueError("Only a ratio of sums requires a denominator field.")
        return self


class TableRollupConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dimensions: list[str] = Field(default_factory=list, max_length=8)
    measures: list[RollupMeasure] = Field(min_length=1, max_length=16)
    subtotals: bool = True
    grand_total: bool = True

    @model_validator(mode="after")
    def identities(self) -> "TableRollupConfig":
        if len(set(self.dimensions)) != len(self.dimensions) or any(not d for d in self.dimensions):
            raise ValueError("Choose distinct rollup dimensions.")
        if len({m.output_id for m in self.measures}) != len(self.measures):
            raise ValueError("Rollup measure identities must be unique.")
        if len({m.name.strip() for m in self.measures}) != len(self.measures):
            raise ValueError("Rollup measure names must be unique.")
        if not self.dimensions and not self.grand_total:
            raise ValueError("A rollup without dimensions needs its grand total.")
        return self


def fields(
    node: NodeInstance, source: DatasetSchema
) -> tuple[TableRollupConfig, list[ColumnSchema]]:
    config = TableRollupConfig.model_validate(node.config)
    try:
        dimensions = [source.by_id(identity) for identity in config.dimensions]
        if any(field.logical_type not in DIMENSIONS for field in dimensions):
            raise ValueConnectionError(
                "Rollup dimensions must be text, integer, boolean or date fields."
            )
        for measure in config.measures:
            for identity in (measure.column_id, measure.denominator_column_id):
                if identity is None:
                    continue
                column = source.by_id(identity)
                if column.logical_type not in NUMERIC:
                    raise ValueConnectionError("Rollup measures require numeric fields.")
                if column.logical_type == LogicalType.DECIMAL and (
                    type(column.metadata.get("scale")) is not int
                    or not 0 <= column.metadata["scale"] <= 38
                ):
                    raise ValueConnectionError(
                        "Rollup decimals require an explicit scale from 0 to 38."
                    )
    except StopIteration as exc:
        raise ValueConnectionError(
            "A selected rollup field is unavailable.", field="config"
        ) from exc
    return config, dimensions


def rollup_schema(node: NodeInstance, source: DatasetSchema) -> DatasetSchema:
    config, dimensions = fields(node, source)
    prefix = f"roll_{node.id.hex}_"
    columns = [
        ColumnSchema(prefix + name, name, label, kind, nullable)
        for name, label, kind, nullable in (
            ("row_id", "Row identity", LogicalType.STRING, False),
            ("parent_id", "Parent identity", LogicalType.STRING, True),
            ("depth", "Grouping depth", LogicalType.INTEGER, False),
            ("kind", "Row kind", LogicalType.STRING, False),
            ("source_count", "Source rows", LogicalType.INTEGER, False),
        )
    ]
    columns.extend(
        replace(
            column,
            column_id=prefix + "dimension_" + column.column_id,
            engine_name=f"dimension_{index}",
            nullable=True,
            metadata={
                **column.metadata,
                "source_columns": [column.column_id],
                "rollup_role": "dimension",
            },
        )
        for index, column in enumerate(dimensions)
    )
    for measure in config.measures:
        value = source.by_id(measure.column_id) if measure.column_id else None
        denominator = (
            source.by_id(measure.denominator_column_id) if measure.denominator_column_id else None
        )
        count = measure.operation in {"count", "count_rows"}
        kind = (
            LogicalType.INTEGER
            if count
            else LogicalType.FLOAT
            if any(
                f is not None and f.logical_type == LogicalType.FLOAT for f in (value, denominator)
            )
            else LogicalType.DECIMAL
        )
        metadata: dict[str, Any] = {
            **(value.metadata if value and not count and denominator is None else {}),
            "source_columns": [f.column_id for f in (value, denominator) if f],
            "rollup_role": "measure",
            "aggregation": measure.operation,
        }
        if kind == LogicalType.DECIMAL:
            metadata.update(
                precision=38,
                scale=measure.scale
                if measure.operation in {"average", "ratio_of_sums"}
                else value.metadata["scale"]
                if value and value.logical_type == LogicalType.DECIMAL
                else 0,
                rounding="half_even",
            )
        if denominator:
            metadata.update(missing_policy="independent_nonempty_sums", zero_denominator="null")
            assert value is not None
            numerator_unit = " · ".join(
                str(value.metadata[key]) for key in ("unit", "currency") if value.metadata.get(key)
            )
            denominator_unit = " · ".join(
                str(denominator.metadata[key])
                for key in ("unit", "currency")
                if denominator.metadata.get(key)
            )
            metadata.update(
                numerator_unit=numerator_unit or None,
                denominator_unit=denominator_unit or None,
            )
            if numerator_unit and denominator_unit:
                metadata["unit"] = (
                    "ratio"
                    if numerator_unit == denominator_unit
                    else f"({numerator_unit}) / ({denominator_unit})"
                )
        columns.append(
            ColumnSchema(
                prefix + f"measure_{measure.output_id.hex}",
                f"measure_{measure.output_id.hex}",
                measure.name.strip(),
                kind,
                not count,
                metadata,
            )
        )
    return DatasetSchema(tuple(columns))


@dataclass
class Accumulator:
    count: int = 0
    value: Fraction | None = None
    denominator: Fraction | None = None

    def merge(self, other: "Accumulator", operation: str) -> None:
        self.count += other.count
        if other.value is not None:
            if self.value is None:
                self.value = other.value
            elif operation == "min":
                self.value = min(self.value, other.value)
            elif operation == "max":
                self.value = max(self.value, other.value)
            else:
                self.value += other.value
        if other.denominator is not None:
            self.denominator = (self.denominator or Fraction(0)) + other.denominator

    def finish(self, measure: RollupMeasure, column: ColumnSchema) -> Any:
        if measure.operation in {"count", "count_rows"}:
            return self.count
        value = self.value
        if measure.operation == "average" and value is not None:
            value /= self.count
        if measure.operation == "ratio_of_sums":
            value = value / self.denominator if value is not None and self.denominator else None
        try:
            if column.logical_type == LogicalType.FLOAT:
                result = float(value) if value is not None else None
                if result is not None and not math.isfinite(result):
                    raise OverflowError
                return result
            return round_exact(value, 38, column.metadata["scale"])
        except (FormulaValidationError, OverflowError) as exc:
            raise ValueConnectionError(
                "Rollup result exceeds numeric precision. Rescale explicitly upstream."
            ) from exc


class TableRollupExecutor(TypedNodeExecutor):
    def infer_outputs(
        self, node: NodeInstance, inputs: dict[str, ValueSchema], context: ExecutionContext
    ) -> dict[str, ValueSchema]:
        source = inputs.get("input")
        if source is None or source.table is None or source.kind != "dataset":
            raise ValueConnectionError("Connect an upstream dataset first.", field="input")
        return {
            "dataset": ValueSchema(
                "dataset",
                table=rollup_schema(node, source.table),
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
        config, dimensions = fields(node, source.schema)
        schema = rollup_schema(node, source.schema)
        measure_columns = schema.columns[5 + len(dimensions) :]
        ids = list(
            dict.fromkeys(
                [
                    *config.dimensions,
                    *(
                        identity
                        for m in config.measures
                        for identity in (m.column_id, m.denominator_column_id)
                        if identity
                    ),
                ]
            )
        )
        selected = [source.schema.by_id(identity) for identity in ids]
        check_size(source.row_count, max(1, len(selected)))
        for field in selected:
            if (
                field.logical_type == LogicalType.FLOAT
                and not source.frame[field.engine_name].drop_nulls().is_finite().all()
            ):
                raise ValueConnectionError("Rollup values must be finite numbers or empty.")
        # Keep leaf states, not complete groups. Totals merge exact sums/counts, not rounded values.
        leaves: dict[tuple[Any, ...], tuple[int, list[Accumulator]]] = {}
        indexes = {identity: index for index, identity in enumerate(ids)}
        projected = source.frame.select([f.engine_name for f in selected])
        iterator = projected.iter_rows() if selected else (() for _ in range(source.row_count))
        for row in iterator:
            key = tuple(row[indexes[d]] for d in config.dimensions)
            if key not in leaves:
                if len(leaves) >= MAX_ROWS:
                    raise ValueConnectionError(
                        "Rollup supports up to 20000 output rows including totals. "
                        "Group or filter upstream."
                    )
                leaves[key] = (0, [Accumulator() for _ in config.measures])
            count, states = leaves[key]
            leaves[key] = count + 1, states
            for measure, state in zip(config.measures, states, strict=True):
                raw = row[indexes[measure.column_id]] if measure.column_id else None
                denominator = (
                    row[indexes[measure.denominator_column_id]]
                    if measure.denominator_column_id
                    else None
                )
                state.merge(
                    Accumulator(
                        count=int(raw is not None or measure.operation == "count_rows"),
                        value=Fraction(raw)
                        if raw is not None and measure.operation != "count"
                        else None,
                        denominator=Fraction(denominator) if denominator is not None else None,
                    ),
                    measure.operation,
                )

        groups = dict(leaves) if dimensions else {}
        children: dict[tuple[Any, ...], dict[tuple[Any, ...], None]] = {}
        for key, (count, states) in leaves.items():
            for depth in range(len(dimensions)):
                prefix = key[:depth]
                children.setdefault(prefix, {})[key[: depth + 1]] = None
                if not (config.grand_total if depth == 0 else config.subtotals):
                    continue
                if prefix not in groups:
                    if len(groups) >= MAX_ROWS:
                        raise ValueConnectionError(
                            "Rollup supports up to 20000 output rows including totals. "
                            "Group or filter upstream."
                        )
                    groups[prefix] = 0, [Accumulator() for _ in config.measures]
                group_count, totals = groups[prefix]
                groups[prefix] = group_count + count, totals
                for measure, total, state in zip(config.measures, totals, states, strict=True):
                    total.merge(state, measure.operation)
        if not dimensions:
            groups = leaves
        if config.grand_total and () not in groups:
            groups[()] = 0, [Accumulator() for _ in config.measures]
        if len(groups) > MAX_ROWS:
            raise ValueConnectionError(
                "Rollup supports up to 20000 output rows including totals. "
                "Group or filter upstream."
            )
        check_size(len(groups), len(schema.columns))

        def identity(key: tuple[Any, ...]) -> str:
            return str(
                uuid.uuid5(
                    node.id,
                    json.dumps(
                        [
                            [field.column_id, field.logical_type.value, value]
                            for field, value in zip(dimensions, key, strict=False)
                        ],
                        default=str,
                        ensure_ascii=False,
                    ),
                )
            )

        order: list[tuple[Any, ...]] = []

        def visit(key: tuple[Any, ...]) -> None:
            for child in children.get(key, {}):
                visit(child)
            if key in groups:
                order.append(key)

        visit(())
        rows = []
        for key in order:
            count, states = groups[key]
            parents = [key[:depth] for depth in range(len(key)) if key[:depth] in groups]
            rows.append(
                [
                    identity(key),
                    identity(parents[-1]) if parents else None,
                    len(key),
                    "grand_total"
                    if not key
                    else "detail"
                    if len(key) == len(dimensions)
                    else "subtotal",
                    count,
                    *key,
                    *([None] * (len(dimensions) - len(key))),
                    *(
                        state.finish(measure, column)
                        for state, measure, column in zip(
                            states, config.measures, measure_columns, strict=True
                        )
                    ),
                ]
            )
        dtypes = {
            c.engine_name: source.frame.schema[
                dimensions[int(c.engine_name.split("_")[1])].engine_name
            ]
            if c.engine_name.startswith("dimension_")
            else pl.Decimal(38, c.metadata["scale"])
            if c.logical_type == LogicalType.DECIMAL
            else pl.Float64
            if c.logical_type == LogicalType.FLOAT
            else pl.Int64
            if c.logical_type == LogicalType.INTEGER
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
                            "input_rows": source.row_count,
                            "leaf_groups": len(leaves),
                            "order": "first_seen_depth_first_totals_last",
                        },
                    },
                ),
            )
        }


def table_rollup_definition() -> NodeDefinition:
    return NodeDefinition(
        type="table_rollup",
        version=1,
        workflow_format=2,
        category=NodeCategory.TRANSFORM,
        display_name="Analytical table totals",
        description="Prepare hierarchical groups and totals from exact observation states, "
        "not rounded subtotals.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(
            PortDefinition("dataset", "Analytical table totals", PortKind.DATASET, False, None),
        ),
        config_schema=TableRollupConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=TableRollupExecutor(),
    )
