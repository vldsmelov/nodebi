"""Internal generic context predicates compiled from published data settings."""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import polars as pl
from pydantic import BaseModel

from app.domain.datasets import Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema, unary_definition


class ContextFilterConfig(BaseModel):
    column_id: str
    role: str
    value: str | int | float | bool | None = None
    start: str | None = None
    end: str | None = None
    timezone: str = "Europe/Moscow"
    logical_type: str | None = None


class ContextFilterExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schema(input_schemas)
        config = ContextFilterConfig.model_validate(node.config)
        column = schema.by_id(config.column_id)
        if config.logical_type and config.logical_type != column.logical_type.value:
            raise ValueError(
                "Context field type differs from its declared role. Convert the type explicitly."
            )
        if config.role == "period" and column.logical_type not in {
            LogicalType.DATE,
            LogicalType.DATETIME,
        }:
            raise ValueError(
                "Period requires a date or datetime field. Convert the type explicitly."
            )
        return schema

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        config = ContextFilterConfig.model_validate(node.config)
        column = schema.by_id(config.column_id)
        expression = pl.col(column.engine_name)
        if config.role == "period":
            assert config.start is not None and config.end is not None
            start = datetime.fromisoformat(config.start).date()
            end = datetime.fromisoformat(config.end).date()
            if column.logical_type == LogicalType.DATE:
                predicate = expression.is_between(start, end, closed="both")
            else:
                zone = ZoneInfo(config.timezone)
                lower = datetime.combine(start, time.min, zone)
                upper = datetime.combine(end + timedelta(days=1), time.min, zone)
                dtype = source.frame.schema[column.engine_name]
                if isinstance(dtype, pl.Datetime) and dtype.time_zone is None:
                    expression = expression.dt.replace_time_zone(
                        config.timezone, ambiguous="raise", non_existent="raise"
                    )
                else:
                    expression = expression.dt.convert_time_zone(config.timezone)
                predicate = (expression >= pl.lit(lower)) & (expression < pl.lit(upper))
        else:
            value = (
                date.fromisoformat(str(config.value))
                if config.logical_type == "date"
                else datetime.fromisoformat(str(config.value))
                if config.logical_type == "datetime"
                else config.value
            )
            predicate = expression == pl.lit(value)
        return Dataset(source.frame.filter(predicate.fill_null(False)), schema, source.metadata)


def context_filter_definition() -> NodeDefinition:
    return unary_definition(
        "context_filter",
        "View restriction",
        "Compiled data context",
        ContextFilterConfig,
        ContextFilterExecutor(),
    )
