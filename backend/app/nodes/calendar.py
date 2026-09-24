from dataclasses import replace
from datetime import date

import polars as pl
from pydantic import BaseModel, Field, model_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext, NodeCategory, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, unary_definition


class CalendarConfig(BaseModel):
    start: date
    end: date
    name: str = Field(default="Date", min_length=1, max_length=255)

    @model_validator(mode="after")
    def bounded(self) -> "CalendarConfig":
        if self.start > self.end or (self.end - self.start).days >= 36600:
            raise ValueError("Calendar requires an ordered range of at most 36600 days.")
        if not self.name.strip():
            raise ValueError("Output field name must not be blank.")
        return self


class CalendarExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        config = CalendarConfig.model_validate(node.config)
        return DatasetSchema(
            (
                ColumnSchema(
                    f"calendar_{node.id.hex}", config.name, config.name, LogicalType.DATE, False
                ),
            )
        )

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        config = CalendarConfig.model_validate(node.config)
        return Dataset(
            pl.DataFrame(
                {config.name: pl.date_range(config.start, config.end, interval="1d", eager=True)}
            ),
            self.infer_schema(node, {}, context),
        )


def calendar_definition() -> NodeDefinition:
    return replace(
        unary_definition(
            "calendar",
            "Calendar",
            "Create an inclusive daily calendar.",
            CalendarConfig,
            CalendarExecutor(),
        ),
        input_ports=(),
        category=NodeCategory.SOURCE,
    )
