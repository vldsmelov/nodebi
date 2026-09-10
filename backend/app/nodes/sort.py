from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.domain.datasets import Dataset, DatasetSchema
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema, unary_definition


class SortKey(BaseModel):
    column_id: str = Field(min_length=1)
    direction: Literal["ascending", "descending"] = "ascending"


class SortConfig(BaseModel):
    keys: list[SortKey] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_fields(self) -> "SortConfig":
        if len({key.column_id for key in self.keys}) != len(self.keys):
            raise ValueError("Sort fields must be unique.")
        return self


class SortExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schema(input_schemas)
        for key in SortConfig.model_validate(node.config).keys:
            schema.by_id(key.column_id)
        return schema

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        keys = SortConfig.model_validate(node.config).keys
        return Dataset(
            source.frame.sort(
                [schema.by_id(key.column_id).engine_name for key in keys],
                descending=[key.direction == "descending" for key in keys],
                nulls_last=True,
                maintain_order=True,
            ),
            schema,
            source.metadata,
        )


def sort_definition() -> NodeDefinition:
    return unary_definition(
        "sort", "Sort", "Order rows by prioritized fields; nulls last.", SortConfig, SortExecutor()
    )
