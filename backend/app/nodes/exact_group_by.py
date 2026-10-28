"""Opt-in v2 aggregation: preserve decimal sums and explicitly rounded averages."""

from dataclasses import replace
from decimal import ROUND_HALF_EVEN, Decimal, localcontext
from typing import Any

import polars as pl
from pydantic import Field

from app.domain.datasets import Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.common import input_schema
from app.nodes.group_by import GroupByConfig, GroupByExecutor, group_by_definition


class ExactGroupByConfig(GroupByConfig):
    decimal_average_scale: int = Field(default=6, ge=0, le=18)


class ExactGroupByExecutor(GroupByExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        original = input_schema(input_schemas)
        compatible = DatasetSchema(
            tuple(
                replace(c, logical_type=LogicalType.FLOAT)
                if c.logical_type == LogicalType.DECIMAL
                else c
                for c in original.columns
            )
        )
        schema = super().infer_schema(node, {"input": compatible}, context)
        config = ExactGroupByConfig.model_validate(node.config)
        columns = [original.by_id(key) for key in config.dimensions]
        for output, aggregation in zip(
            schema.columns[len(columns) :], config.aggregations, strict=True
        ):
            source = original.by_id(aggregation.column_id) if aggregation.column_id else None
            if (
                source
                and source.logical_type == LogicalType.DECIMAL
                and aggregation.operation not in {"count", "distinct_count"}
            ):
                scale = (
                    config.decimal_average_scale
                    if aggregation.operation == "average"
                    else source.metadata.get("scale", 2)
                )
                output = replace(
                    output,
                    logical_type=LogicalType.DECIMAL,
                    metadata={
                        **source.metadata,
                        **output.metadata,
                        "precision": 38,
                        "scale": scale,
                        "rounding": "half_even",
                    },
                )
            columns.append(output)
        return DatasetSchema(tuple(columns))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        config = ExactGroupByConfig.model_validate(node.config)
        decimal_indexes = [
            i
            for i, a in enumerate(config.aggregations)
            if a.column_id and source.schema.by_id(a.column_id).logical_type == LogicalType.DECIMAL
        ]
        if not decimal_indexes:
            return super().execute(node, inputs, context)
        dimensions = [source.schema.by_id(key).engine_name for key in config.dimensions]
        groups = (
            source.frame.partition_by(dimensions, maintain_order=True)
            if dimensions
            else [source.frame]
        )
        records: list[list[Any]] = []
        with localcontext() as decimal_context:
            decimal_context.prec = 80
            for group in groups:
                row = [group[name][0] for name in dimensions]
                for index, aggregation in enumerate(config.aggregations):
                    if index not in decimal_indexes:
                        single = replace(
                            node,
                            config={"dimensions": [], "aggregations": [aggregation.model_dump()]},
                        )
                        item = GroupByExecutor().execute(
                            single,
                            {"input": Dataset(group, source.schema, source.metadata)},
                            context,
                        )
                        row.append(item.frame.item())
                        continue
                    field = source.schema.by_id(aggregation.column_id or "")
                    values = group[field.engine_name].drop_nulls().to_list()
                    output = schema.columns[len(dimensions) + index]
                    value: Decimal | int | None
                    if aggregation.operation == "count":
                        value = len(values)
                    elif aggregation.operation == "distinct_count":
                        value = len(set(values))
                    elif not values:
                        value = None
                    elif aggregation.operation in {"sum", "average"}:
                        value = sum(values, Decimal(0))
                        if aggregation.operation == "average":
                            value = (value / len(values)).quantize(
                                Decimal(1).scaleb(-output.metadata["scale"]),
                                rounding=ROUND_HALF_EVEN,
                            )
                    else:
                        value = min(values) if aggregation.operation == "min" else max(values)
                    if isinstance(value, Decimal) and abs(value) >= Decimal(10) ** (
                        38 - output.metadata["scale"]
                    ):
                        raise NodeExecutionError(
                            "Decimal aggregation exceeds 38 digits. Reduce scale explicitly."
                        )
                    row.append(value)
                records.append(row)
        polars_schema = {
            c.engine_name: pl.Decimal(38, c.metadata["scale"])
            if c.logical_type == LogicalType.DECIMAL
            else source.frame.schema[c.engine_name]
            if i < len(dimensions)
            else pl.Int64
            if c.logical_type == LogicalType.INTEGER
            else pl.Float64
            if c.logical_type == LogicalType.FLOAT
            else source.frame.schema[
                source.schema.by_id(
                    config.aggregations[i - len(dimensions)].column_id or ""
                ).engine_name
            ]
            for i, c in enumerate(schema.columns)
        }
        frame = pl.DataFrame(records, schema=polars_schema, orient="row")
        return Dataset(frame, schema, {**source.metadata, "exact_transport": True})


def exact_group_by_definition() -> NodeDefinition:
    return replace(
        group_by_definition(),
        version=2,
        executor=ExactGroupByExecutor(),
        config_schema=ExactGroupByConfig,
        description=(
            "Exact decimal sums and half-even averages; legacy numeric fields retain v1 behavior."
        ),
    )
