from dataclasses import replace
from typing import Literal, Self

import polars as pl
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType, logical_to_polars
from app.domain.errors import NodeExecutionError
from app.domain.join_diagnostics import JoinDiagnostics
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


class JoinKey(BaseModel):
    model_config = ConfigDict(extra="forbid")
    left_key: str = Field(min_length=1)
    right_key: str = Field(min_length=1)


class MultiJoinConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    keys: list[JoinKey] = Field(min_length=1, max_length=32)
    how: Literal["inner", "left"] = "inner"
    relationship: Literal["many_to_many", "many_to_one", "one_to_one"] = "many_to_many"

    @model_validator(mode="after")
    def unique_keys(self) -> Self:
        for side in ("left_key", "right_key"):
            values = [getattr(key, side) for key in self.keys]
            if len(set(values)) != len(values):
                raise ValueError("Join key fields must be unique on each side.")
        return self


def join_config(node: NodeInstance) -> MultiJoinConfig:
    if node.version == 1:
        original = JoinConfig.model_validate(node.config)
        return MultiJoinConfig(
            keys=[JoinKey(left_key=original.left_key, right_key=original.right_key)],
            how=original.how,
        )
    return MultiJoinConfig.model_validate(node.config)


class UnionConfig(BaseModel):
    pass


class JoinExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        left, right = pair(input_schemas)
        config = join_config(node)
        key_types = {
            key.left_key: compatible(
                left.by_id(key.left_key).logical_type, right.by_id(key.right_key).logical_type
            )
            for key in config.keys
        }
        right_types = {key.right_key: key_types[key.left_key] for key in config.keys}
        columns = [
            replace(c, logical_type=key_types.get(c.column_id, c.logical_type))
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
                    right_types.get(field.column_id, field.logical_type),
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
        config = join_config(node)
        left_keys = [left.schema.by_id(key.left_key).engine_name for key in config.keys]
        mapping = {
            old.engine_name: new.engine_name
            for old, new in zip(
                right.schema.columns, schema.columns[len(left.schema.columns) :], strict=True
            )
        }
        right_keys = [mapping[right.schema.by_id(key.right_key).engine_name] for key in config.keys]
        dtypes = [logical_to_polars(schema.by_id(key.left_key).logical_type) for key in config.keys]
        left_frame = left.frame.with_columns(
            [pl.col(key).cast(dtype) for key, dtype in zip(left_keys, dtypes, strict=True)]
        )
        right_frame = right.frame.rename(mapping).with_columns(
            [pl.col(key).cast(dtype) for key, dtype in zip(right_keys, dtypes, strict=True)]
        )
        # Count composite keys before materializing potentially expanding joins.
        names = [f"key_{i}" for i in range(len(config.keys))]
        counts_left = (
            left_frame.select(
                [pl.col(key).alias(name) for key, name in zip(left_keys, names, strict=True)]
            )
            .group_by(names)
            .len()
            .rename({"len": "n_left"})
        )
        counts_right = (
            right_frame.select(
                [pl.col(key).alias(name) for key, name in zip(right_keys, names, strict=True)]
            )
            .group_by(names)
            .len()
            .rename({"len": "n_right"})
        )
        complete = pl.all_horizontal([pl.col(name).is_not_null() for name in names])
        left_duplicates = counts_left.filter(complete & (pl.col("n_left") > 1)).height
        right_duplicates = counts_right.filter(complete & (pl.col("n_right") > 1)).height
        if config.relationship in {"many_to_one", "one_to_one"} and right_duplicates:
            raise NodeExecutionError(
                "Right join keys are not unique. "
                "Correct the keys or explicitly allow multiple matches."
            )
        if config.relationship == "one_to_one" and left_duplicates:
            raise NodeExecutionError(
                "Left join keys are not unique. "
                "Correct the keys or change the expected relationship."
            )
        counts = counts_left.join(counts_right, on=names, how=config.how, nulls_equal=False)
        rows = sum(
            int(a) * (int(b) if b is not None else 1)
            for a, b in counts.select("n_left", "n_right").iter_rows()
        )
        check_size(rows, len(schema.columns))
        frame = left_frame.join(
            right_frame,
            left_on=left_keys,
            right_on=right_keys,
            how=config.how,
            coalesce=False,
            nulls_equal=False,
            maintain_order="left_right",
        )
        matched = counts.filter(pl.col("n_right").is_not_null())
        matched_left = int(matched["n_left"].sum())
        matched_right = int(matched["n_right"].sum())
        multiplied = matched.filter(pl.col("n_right") > 1)
        diagnostics = JoinDiagnostics(
            node_id=node.id,
            how=config.how,
            left_rows=left.row_count,
            right_rows=right.row_count,
            matched_left_rows=matched_left,
            unmatched_left_rows=left.row_count - matched_left,
            matched_right_rows=matched_right,
            unmatched_right_rows=right.row_count - matched_right,
            left_duplicate_keys=left_duplicates,
            right_duplicate_keys=right_duplicates,
            multiplied_left_rows=int(multiplied["n_left"].sum()),
            additional_rows=sum(
                int(a) * (int(b) - 1) for a, b in multiplied.select("n_left", "n_right").iter_rows()
            ),
            dropped_left_rows=left.row_count - matched_left if config.how == "inner" else 0,
            result_rows=frame.height,
        )
        return Dataset(
            frame.select([c.engine_name for c in schema.columns]),
            schema,
            {"join_diagnostics": diagnostics.model_dump(mode="json")},
        )


def union_schema(left: DatasetSchema, right: DatasetSchema) -> DatasetSchema:
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


def union_datasets(left: Dataset, right: Dataset) -> Dataset:
    """Shared bounded Union; no deduplication or financial logic."""
    schema = union_schema(left.schema, right.schema)
    check_size(left.row_count + right.row_count, len(schema.columns))
    frames = [
        source.frame.select(
            [pl.col(c.engine_name).cast(logical_to_polars(c.logical_type)) for c in schema.columns]
        )
        for source in (left, right)
    ]
    return Dataset(pl.concat(frames, how="vertical"), schema)


class UnionExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        return union_schema(*pair(input_schemas))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        return union_datasets(inputs["left"], inputs["right"])


def combine_definitions() -> tuple[NodeDefinition, ...]:
    definitions = tuple(
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

    return (*definitions, replace(definitions[0], version=2, config_schema=MultiJoinConfig))
