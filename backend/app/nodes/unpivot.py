from typing import cast

import polars as pl
from pydantic import BaseModel, Field, field_validator, model_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType, logical_to_polars
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.combine import check_size
from app.nodes.common import UnaryExecutor, input_schema, unary_definition


class UnpivotConfig(BaseModel):
    identifiers: list[str] = Field(default_factory=list)
    columns: list[str] = Field(min_length=1, max_length=1024)
    labels: dict[str, str] = Field(default_factory=dict, max_length=1024)

    @field_validator("labels")
    @classmethod
    def normalize_labels(cls, labels: dict[str, str]) -> dict[str, str]:
        result = {key: " ".join(value.split()) for key, value in labels.items()}
        if any(not value or len(value) > 255 for value in result.values()):
            raise ValueError("Unpivot labels must contain 1 to 255 characters.")
        return result

    @model_validator(mode="after")
    def labels_reference_values(self) -> "UnpivotConfig":
        if not self.labels.keys() <= set(self.columns):
            raise ValueError("Unpivot labels must reference selected value fields.")
        return self


class UnpivotExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        source = input_schema(input_schemas)
        config = UnpivotConfig.model_validate(node.config)
        keys = config.identifiers + config.columns
        if len(set(keys)) != len(keys):
            raise ValueError("Unpivot identifier and value fields must be distinct.")
        fields = [source.by_id(key) for key in config.columns]
        types = {field.logical_type for field in fields} - {LogicalType.UNKNOWN}
        if types <= {LogicalType.INTEGER, LogicalType.FLOAT}:
            dtype = LogicalType.FLOAT if LogicalType.FLOAT in types else LogicalType.INTEGER
        elif len(types) <= 1:
            dtype = next(iter(types), LogicalType.UNKNOWN)
        else:
            raise ValueError("Unpivot fields require compatible types. Convert them first.")
        value_metadata: dict[str, object] = {"source_columns": config.columns}
        if dtype == LogicalType.DECIMAL:
            decimals = [field for field in fields if field.logical_type == LogicalType.DECIMAL]
            scales = [field.metadata.get("scale") for field in decimals]
            if any(type(scale) is not int or not 0 <= scale <= 38 for scale in scales):
                raise ValueError("Unpivot decimal fields require explicit scales from 0 to 38.")
            value_metadata.update(precision=38, scale=max(cast(list[int], scales)))
            for key in ("unit", "currency"):
                declared = [field.metadata.get(key) for field in decimals]
                known = {value for value in declared if value is not None}
                if len(known) > 1:
                    raise ValueError(
                        "Unpivot decimal fields require compatible units and currencies."
                    )
                if known and all(value is not None for value in declared):
                    value_metadata[key] = declared[0]
        outputs = [source.by_id(key) for key in config.identifiers]
        for name, logical in [
            ("field_id", LogicalType.STRING),
            ("field_name", LogicalType.STRING),
            ("value", dtype),
        ]:
            outputs.append(
                ColumnSchema(
                    f"unpivot_{node.id.hex}_{name}",
                    name,
                    name,
                    logical,
                    name == "value",
                    value_metadata if name == "value" else {"source_columns": config.columns},
                )
            )
        return DatasetSchema(tuple(outputs))

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        config = UnpivotConfig.model_validate(node.config)
        schema = self.infer_schema(node, {"input": source.schema}, context)
        check_size(source.row_count * len(config.columns), len(schema.columns))
        identifiers = [source.schema.by_id(key).engine_name for key in config.identifiers]
        frames = []
        value_schema = schema.columns[-1]
        target_type = (
            pl.Decimal(38, value_schema.metadata["scale"])
            if value_schema.logical_type == LogicalType.DECIMAL
            else logical_to_polars(value_schema.logical_type)
        )
        for key in config.columns:
            column = source.schema.by_id(key)
            if column.logical_type == LogicalType.DECIMAL:
                physical = source.frame.schema[column.engine_name]
                if (
                    not isinstance(physical, pl.Decimal)
                    or physical.scale != column.metadata["scale"]
                ):
                    raise NodeExecutionError(
                        "Unpivot decimal input does not match its declared scale."
                    )
            try:
                values = source.frame[column.engine_name].cast(target_type, strict=True)
            except pl.exceptions.PolarsError as exc:
                raise NodeExecutionError(
                    "Unpivot values exceed the common output precision. Reduce scale explicitly."
                ) from exc
            frames.append(
                source.frame.select(
                    *[pl.col(name) for name in identifiers],
                    pl.lit(key).alias("field_id"),
                    pl.lit(config.labels.get(key, column.display_name)).alias("field_name"),
                    values.alias("value"),
                )
            )
        return Dataset(
            pl.concat(frames),
            schema,
            {**source.metadata, "exact_transport": True}
            if value_schema.logical_type == LogicalType.DECIMAL
            else source.metadata,
        )


def unpivot_definition() -> NodeDefinition:
    return unary_definition(
        "unpivot", "Unpivot", "Turn selected fields into rows.", UnpivotConfig, UnpivotExecutor()
    )
