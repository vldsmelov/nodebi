from pydantic import BaseModel, Field

from app.domain.datasets import Dataset, DatasetSchema
from app.domain.nodes import ExecutionContext, NodeDefinition
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema, unary_definition


class LimitConfig(BaseModel):
    limit: int = Field(gt=0, strict=True)


class LimitExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        LimitConfig.model_validate(node.config)
        return input_schema(input_schemas)

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        return Dataset(
            source.frame.head(min(LimitConfig.model_validate(node.config).limit, source.row_count)),
            schema,
            source.metadata,
        )


def limit_definition() -> NodeDefinition:
    return unary_definition(
        "limit", "Limit", "Keep the first N rows.", LimitConfig, LimitExecutor()
    )
