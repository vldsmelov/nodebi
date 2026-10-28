"""Opt-in aggregation v3 keeps output identities independent of ordering and labels."""

import uuid
from dataclasses import replace

from pydantic import Field, model_validator

from app.domain.datasets import DatasetSchema
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.exact_group_by import (
    ExactGroupByConfig,
    ExactGroupByExecutor,
    exact_group_by_definition,
)
from app.nodes.group_by import Aggregation


class StableAggregation(Aggregation):
    output_id: uuid.UUID


class StableGroupByConfig(ExactGroupByConfig):
    aggregations: list[StableAggregation] = Field(min_length=1, max_length=256)  # type: ignore[assignment]

    @model_validator(mode="after")
    def unique_outputs(self) -> "StableGroupByConfig":
        if len({a.output_id for a in self.aggregations}) != len(self.aggregations):
            raise ValueError("Measure identities must be unique.")
        return self


class StableGroupByExecutor(ExactGroupByExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = super().infer_schema(node, input_schemas, context)
        config = StableGroupByConfig.model_validate(node.config)
        count = len(config.dimensions)
        outputs = [
            replace(column, column_id=f"measure_{aggregation.output_id.hex}")
            for column, aggregation in zip(schema.columns[count:], config.aggregations, strict=True)
        ]
        return DatasetSchema((*schema.columns[:count], *outputs))


def stable_group_by_definition() -> NodeDefinition:
    return replace(
        exact_group_by_definition(),
        version=3,
        config_schema=StableGroupByConfig,
        executor=StableGroupByExecutor(),
        description="Exact decimal aggregation with stable measure identities.",
    )
