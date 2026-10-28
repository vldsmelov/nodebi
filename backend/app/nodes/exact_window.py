"""Opt-in exact windows; legacy window@1/@2 retain their Float64 semantics."""

from dataclasses import replace
from decimal import Decimal
from fractions import Fraction

import polars as pl
from pydantic import ConfigDict

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.exact_formulas import round_exact
from app.domain.formulas import FormulaValidationError
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema
from app.nodes.window import OrderedWindowConfig, WindowExecutor, window_definition


class ExactWindowConfig(OrderedWindowConfig):
    model_config = ConfigDict(extra="forbid")


class ExactWindowExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        source = input_schema(input_schemas)
        config = ExactWindowConfig.model_validate(node.config)
        if config.operation != "row_number" and not config.column_id:
            raise ValueError("Window requires a numeric field.")
        field = source.by_id(config.column_id or "") if config.operation != "row_number" else None
        if field and field.logical_type not in {
            LogicalType.INTEGER,
            LogicalType.DECIMAL,
            LogicalType.UNKNOWN,
        }:
            raise ValueError(
                "Exact windows require decimal or integer fields; Float64 is not converted."
            )
        # Reuse established name/partition/order validation, not legacy execution or output typing.
        compatible = DatasetSchema(
            tuple(
                replace(c, logical_type=LogicalType.FLOAT)
                if c.logical_type == LogicalType.DECIMAL
                else c
                for c in source.columns
            )
        )
        WindowExecutor().infer_schema(replace(node, version=2), {"input": compatible}, context)
        if len({key.column_id for key in config.order_by}) != len(config.order_by):
            raise ValueError("Window ordering fields must be unique.")
        scale = (
            field.metadata.get("scale", 2)
            if field and field.logical_type == LogicalType.DECIMAL
            else 0
        )
        if type(scale) is not int or not 0 <= scale <= 38:
            raise ValueError("Exact window input requires a decimal scale from 0 to 38.")
        metadata = {
            **(field.metadata if field else {}),
            "source_columns": [field.column_id] if field else [],
        }
        if field:
            metadata.update(precision=38, scale=scale)
        return DatasetSchema(
            (
                *source.columns,
                ColumnSchema(
                    f"window_{node.id.hex}",
                    config.name,
                    config.name,
                    LogicalType.DECIMAL if field else LogicalType.INTEGER,
                    field is not None,
                    metadata,
                ),
            )
        )

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        config = ExactWindowConfig.model_validate(node.config)
        # Unlike joins, a window cannot multiply rows. Bound the one-column expansion and sort.
        if (
            source.row_count > 250_000
            or len(schema.columns) > 1024
            or source.row_count * len(schema.columns) > 20_000_000
        ):
            raise NodeExecutionError(
                "Exact window exceeds the 250000-row, 1024-column or 20000000-cell limit."
            )
        partitions = [source.schema.by_id(key).engine_name for key in config.partitions]
        ordering = [source.schema.by_id(key.column_id).engine_name for key in config.order_by]
        frame = source.frame
        if config.operation != "sum":
            keys = list(dict.fromkeys([*partitions, *ordering]))
            if frame.select(keys).is_duplicated().any():
                raise NodeExecutionError("Window ordering has ties. Add a unique ordering field.")
            frame = frame.sort(
                ordering,
                descending=[key.direction == "descending" for key in config.order_by],
                nulls_last=True,
                maintain_order=True,
            )
        index_name = "__window_row"
        while index_name in frame.columns:
            index_name += "_"
        groups = (
            frame.select(partitions)
            .with_row_index(index_name)
            .group_by(partitions, maintain_order=True)
            .agg(pl.col(index_name))[index_name]
            .to_list()
            if partitions
            else [list(range(frame.height))]
        )
        result: list[Decimal | int | None] = [None] * frame.height
        try:
            if config.operation == "row_number":
                for indices in groups:
                    for number, index in enumerate(indices, 1):
                        result[index] = number
            else:
                field = source.schema.by_id(config.column_id or "")
                scale = schema.columns[-1].metadata["scale"]
                values: list[Fraction | None] = []
                for value in frame[field.engine_name]:
                    if (
                        value is not None
                        and type(value) is not int
                        and not isinstance(value, Decimal)
                    ):
                        raise NodeExecutionError(
                            "Exact window input does not match its numeric schema."
                        )
                    exact = Fraction(value) if value is not None else None
                    if exact is not None and (exact * 10**scale).denominator != 1:
                        raise NodeExecutionError(
                            "Exact window input does not match its decimal scale."
                        )
                    values.append(exact)
                for indices in groups:
                    total: Fraction | None = None
                    previous: Fraction | None = None
                    if config.operation == "sum":
                        for index in indices:
                            value = values[index]
                            if value is not None:
                                total = (total or Fraction(0)) + value
                        rounded = round_exact(total, 38, scale)
                        for index in indices:
                            result[index] = rounded
                        continue
                    for index in indices:
                        value = values[index]
                        if config.operation == "previous":
                            output = previous
                        elif value is None:
                            output = None
                        elif config.operation == "cumulative_sum":
                            total = (total or Fraction(0)) + value
                            output = total
                        else:
                            total = value if total is None else max(total, value)
                            output = total
                        result[index] = round_exact(output, 38, scale)
                        previous = value
            series = pl.Series(
                config.name,
                result,
                dtype=pl.Int64 if config.operation == "row_number" else pl.Decimal(38, scale),
            )
        except (FormulaValidationError, ArithmeticError, pl.exceptions.PolarsError) as exc:
            raise NodeExecutionError(
                "Exact window exceeds decimal precision or has invalid input. "
                "Reduce scale explicitly."
            ) from exc
        return Dataset(
            frame.with_columns(series), schema, {**source.metadata, "exact_transport": True}
        )


def exact_window_definition() -> NodeDefinition:
    return replace(
        window_definition(),
        version=3,
        display_name="Exact Window",
        description="Exact partition and cumulative totals, extrema and previous values.",
        config_schema=ExactWindowConfig,
        executor=ExactWindowExecutor(),
    )
