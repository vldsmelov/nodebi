import polars as pl
from pydantic import BaseModel, Field

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType, logical_to_polars
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.combine import check_size
from app.nodes.common import UnaryExecutor, input_schema, unary_definition


class UnpivotConfig(BaseModel):
    identifiers: list[str] = Field(default_factory=list)
    columns: list[str] = Field(min_length=1, max_length=1024)


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
                    {"source_columns": config.columns},
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
        for key in config.columns:
            column = source.schema.by_id(key)
            frames.append(
                source.frame.select(
                    *[pl.col(name) for name in identifiers],
                    pl.lit(key).alias("field_id"),
                    pl.lit(column.display_name).alias("field_name"),
                    pl.col(column.engine_name)
                    .cast(logical_to_polars(schema.columns[-1].logical_type))
                    .alias("value"),
                )
            )
        return Dataset(pl.concat(frames), schema, source.metadata)


def unpivot_definition() -> NodeDefinition:
    return unary_definition(
        "unpivot", "Unpivot", "Turn selected fields into rows.", UnpivotConfig, UnpivotExecutor()
    )
