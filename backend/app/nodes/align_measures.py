"""Lossless full alignment of two prepared measures at explicitly selected grain."""

from dataclasses import replace
from typing import Literal, Self

import polars as pl
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.join_diagnostics import AlignmentDiagnostics
from app.domain.nodes import ExecutionContext, NodeDefinition, PortDefinition, PortKind
from app.domain.workflows import NodeInstance
from app.nodes.combine import JoinKey, check_size, pair
from app.nodes.common import UnaryExecutor, unary_definition


class AlignMeasuresConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    keys: list[JoinKey] = Field(min_length=1, max_length=8)
    left_value: str = Field(min_length=1)
    right_value: str = Field(min_length=1)
    left_name: str = Field(default="Left measure", min_length=1, max_length=150)
    right_name: str = Field(default="Right measure", min_length=1, max_length=150)
    null_keys: Literal["reject", "match"] = "reject"

    @model_validator(mode="after")
    def distinct(self) -> Self:
        for side in ("left", "right"):
            keys = [getattr(key, f"{side}_key") for key in self.keys]
            if len(set(keys)) != len(keys) or getattr(self, f"{side}_value") in keys:
                raise ValueError("Alignment keys and measure must be distinct on each side.")
        if self.left_name == self.right_name:
            raise ValueError("Give the aligned measures different names.")
        return self


class AlignMeasuresExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        left, right = pair(input_schemas)
        config = AlignMeasuresConfig.model_validate(node.config)
        columns = []
        for index, key in enumerate(config.keys):
            a, b = left.by_id(key.left_key), right.by_id(key.right_key)
            if a.logical_type != b.logical_type or a.logical_type not in {
                LogicalType.STRING,
                LogicalType.INTEGER,
                LogicalType.DATE,
                LogicalType.BOOLEAN,
            }:
                raise ValueError(
                    "Alignment keys must share a string, integer, date or boolean type. "
                    "Convert them explicitly upstream."
                )
            columns.append(
                replace(
                    a,
                    column_id=f"align_{node.id.hex}_key_{a.column_id}",
                    engine_name=f"key_{index}",
                    nullable=a.nullable or b.nullable,
                    metadata={**a.metadata, "source_columns": [a.column_id, b.column_id]},
                )
            )
        for side, schema in (("left", left), ("right", right)):
            value = schema.by_id(getattr(config, f"{side}_value"))
            if value.logical_type not in {
                LogicalType.INTEGER,
                LogicalType.FLOAT,
                LogicalType.DECIMAL,
            }:
                raise ValueError("Alignment measures must be numeric prepared fields.")
            columns.append(
                replace(
                    value,
                    column_id=f"align_{node.id.hex}_{side}_value",
                    engine_name=f"{side}_value",
                    display_name=getattr(config, f"{side}_name"),
                    nullable=True,
                    metadata={
                        **value.metadata,
                        "source_columns": [value.column_id],
                        "input_port": side,
                    },
                )
            )
        for side in ("left", "right"):
            columns.append(
                ColumnSchema(
                    f"align_{node.id.hex}_{side}_present",
                    f"{side}_present",
                    f"{getattr(config, f'{side}_name')} · present",
                    LogicalType.BOOLEAN,
                    False,
                )
            )
        return DatasetSchema(tuple(columns))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        schema = self.infer_schema(
            node, {side: data.schema for side, data in inputs.items()}, context
        )
        config = AlignMeasuresConfig.model_validate(node.config)
        names = [f"key_{i}" for i in range(len(config.keys))]
        frames = []
        for side in ("left", "right"):
            source = inputs[side]
            check_size(source.row_count, len(schema.columns))
            fields = [
                source.schema.by_id(getattr(key, f"{side}_key")).engine_name for key in config.keys
            ]
            value = source.schema.by_id(getattr(config, f"{side}_value")).engine_name
            frame = source.frame.select(
                *[pl.col(field).alias(name) for field, name in zip(fields, names, strict=True)],
                pl.col(value).alias(f"{side}_value"),
                pl.lit(True).alias(f"{side}_present"),
            )
            if (
                config.null_keys == "reject"
                and frame.select(pl.any_horizontal(pl.col(names).is_null()).any()).item()
            ):
                raise NodeExecutionError(
                    f"{side.title()} alignment keys contain empty values. "
                    "Correct them or explicitly match empty keys."
                )
            if frame.select(names).is_duplicated().any():
                raise NodeExecutionError(
                    f"{side.title()} alignment keys are not unique. "
                    "Prepare one row per key; values were not aggregated."
                )
            if (~frame[f"{side}_value"].cast(pl.Float64).is_finite()).any():
                raise NodeExecutionError("Alignment measures must be finite numbers or empty.")
            frames.append(frame)
        if any(frames[0].schema[name] != frames[1].schema[name] for name in names):
            raise NodeExecutionError(
                "Alignment key storage types differ. Convert them explicitly upstream."
            )
        matched = (
            frames[0]
            .select(names)
            .join(
                frames[1].select(names),
                on=names,
                how="inner",
                nulls_equal=config.null_keys == "match",
            )
            .height
        )
        count = inputs["left"].row_count + inputs["right"].row_count - matched
        check_size(count, len(schema.columns))
        frame = (
            frames[0]
            .join(
                frames[1],
                on=names,
                how="full",
                coalesce=True,
                nulls_equal=config.null_keys == "match",
                maintain_order="left_right",
            )
            .with_columns(pl.col("left_present", "right_present").fill_null(False))
        )
        return Dataset(
            frame.select([c.engine_name for c in schema.columns]),
            schema,
            {
                "exact_transport": True,
                "alignment_diagnostics": AlignmentDiagnostics(
                    node_id=node.id,
                    matched_rows=matched,
                    left_only_rows=inputs["left"].row_count - matched,
                    right_only_rows=inputs["right"].row_count - matched,
                    result_rows=count,
                ).model_dump(mode="json"),
            },
        )


def align_measures_definition() -> NodeDefinition:
    return replace(
        unary_definition(
            "align_measures",
            "Align measures",
            "Fully align two unique prepared measures without aggregation. "
            "Missing sides remain empty.",
            AlignMeasuresConfig,
            AlignMeasuresExecutor(),
        ),
        input_ports=(
            PortDefinition("left", "Left dataset", PortKind.DATASET),
            PortDefinition("right", "Right dataset", PortKind.DATASET),
        ),
    )
