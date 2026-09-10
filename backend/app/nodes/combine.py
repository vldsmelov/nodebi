from dataclasses import replace
from typing import Literal

import polars as pl
from pydantic import BaseModel, Field

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType, logical_to_polars
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext, NodeDefinition, PortDefinition, PortKind
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, unary_definition


def compatible(left: LogicalType, right: LogicalType) -> LogicalType:
    if left == right:
        return left
    if left == LogicalType.UNKNOWN:
        return right
    if right == LogicalType.UNKNOWN:
        return left
    raise ValueError("Fields must have matching logical types. Convert them explicitly upstream.")


def check_size(rows: int, columns: int) -> None:
    if rows > 250_000 or rows * columns > 2_000_000 or columns > 1024:
        raise NodeExecutionError(
            "Combined dataset exceeds the 250000-row, 1024-column or 2000000-cell limit."
        )


def pair(schemas: dict[str, DatasetSchema]) -> tuple[DatasetSchema, DatasetSchema]:
    if "left" not in schemas or "right" not in schemas:
        raise ValueError("Connect both left and right datasets.")
    return schemas["left"], schemas["right"]


class JoinConfig(BaseModel):
    left_key: str = Field(min_length=1)
    right_key: str = Field(min_length=1)
    how: Literal["inner", "left"] = "inner"


class UnionConfig(BaseModel):
    pass


class JoinExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        left, right = pair(input_schemas)
        config = JoinConfig.model_validate(node.config)
        key_type = compatible(
            left.by_id(config.left_key).logical_type, right.by_id(config.right_key).logical_type
        )
        columns = [
            replace(c, logical_type=key_type) if c.column_id == config.left_key else c
            for c in left.columns
        ]
        reserved = {c.engine_name for c in (*left.columns, *right.columns)}
        used = {c.engine_name for c in left.columns}
        for field in right.columns:
            name = field.engine_name
            suffix = 1
            if name in used:
                name = f"{field.engine_name}__right"
                while name in reserved or name in used:
                    suffix += 1
                    name = f"{field.engine_name}__right_{suffix}"
            used.add(name)
            columns.append(
                ColumnSchema(
                    f"join_{node.id.hex}_right_{field.column_id}",
                    name,
                    name,
                    key_type if field.column_id == config.right_key else field.logical_type,
                    field.nullable or config.how == "left",
                    {**field.metadata, "source_columns": [field.column_id], "input_port": "right"},
                )
            )
        return DatasetSchema(tuple(columns))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        schema = self.infer_schema(
            node, {key: value.schema for key, value in inputs.items()}, context
        )
        left, right = inputs["left"], inputs["right"]
        config = JoinConfig.model_validate(node.config)
        left_key = left.schema.by_id(config.left_key).engine_name
        mapping = {
            old.engine_name: new.engine_name
            for old, new in zip(
                right.schema.columns, schema.columns[len(left.schema.columns) :], strict=True
            )
        }
        right_key = mapping[right.schema.by_id(config.right_key).engine_name]
        dtype = logical_to_polars(schema.by_id(config.left_key).logical_type)
        left_frame = left.frame.with_columns(pl.col(left_key).cast(dtype))
        right_frame = right.frame.rename(mapping).with_columns(pl.col(right_key).cast(dtype))
        # Estimate multiplication before allocating a potentially huge many-to-many join.
        counts_left = (
            left_frame.select(pl.col(left_key).alias("key"))
            .group_by("key")
            .len()
            .rename({"len": "n_left"})
        )
        counts_right = (
            right_frame.select(pl.col(right_key).alias("key"))
            .group_by("key")
            .len()
            .rename({"len": "n_right"})
        )
        counts = counts_left.join(counts_right, on="key", how=config.how, nulls_equal=False)
        rows = sum(
            int(a) * (int(b) if b is not None else 1)
            for a, b in counts.select("n_left", "n_right").iter_rows()
        )
        check_size(rows, len(schema.columns))
        frame = left_frame.join(
            right_frame,
            left_on=left_key,
            right_on=right_key,
            how=config.how,
            coalesce=False,
            nulls_equal=False,
            maintain_order="left_right",
        )
        return Dataset(frame.select([c.engine_name for c in schema.columns]), schema)


class UnionExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        left, right = pair(input_schemas)
        if {c.engine_name for c in left.columns} != {c.engine_name for c in right.columns}:
            raise ValueError("Union requires matching field names on both inputs.")
        columns = []
        for field in left.columns:
            other = right.by_name(field.engine_name)
            columns.append(
                replace(
                    field,
                    logical_type=compatible(field.logical_type, other.logical_type),
                    nullable=field.nullable or other.nullable,
                    metadata={
                        **field.metadata,
                        "source_columns": [field.column_id, other.column_id],
                    },
                )
            )
        return DatasetSchema(tuple(columns))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        schema = self.infer_schema(
            node, {key: value.schema for key, value in inputs.items()}, context
        )
        check_size(sum(source.row_count for source in inputs.values()), len(schema.columns))
        frames = [
            inputs[port].frame.select(
                [
                    pl.col(c.engine_name).cast(logical_to_polars(c.logical_type))
                    for c in schema.columns
                ]
            )
            for port in ("left", "right")
        ]
        return Dataset(pl.concat(frames, how="vertical"), schema)


def combine_definitions() -> tuple[NodeDefinition, ...]:
    return tuple(
        replace(
            unary_definition(kind, kind.title(), description, config, executor),
            input_ports=(
                PortDefinition("left", "Left dataset", PortKind.DATASET),
                PortDefinition("right", "Right dataset", PortKind.DATASET),
            ),
        )
        for kind, description, config, executor in (
            ("join", "Join two datasets on matching keys.", JoinConfig, JoinExecutor()),
            ("union", "Append matching fields in left input order.", UnionConfig, UnionExecutor()),
        )
    )
