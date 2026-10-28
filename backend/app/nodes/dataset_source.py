import uuid

from pydantic import BaseModel, Field

from app.domain.dataset_access import DatasetAccess
from app.domain.datasets import Dataset, DatasetSchema
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
)
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor


class DatasetSourceConfig(BaseModel):
    source_id: uuid.UUID
    resource_id: str = Field(min_length=1, max_length=255)


class DatasetSourceExecutor(UnaryExecutor):
    @staticmethod
    def access(context: ExecutionContext) -> DatasetAccess:
        if context.datasets is None:
            raise ValueError("Prepared dataset access is unavailable.")
        return context.datasets

    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        config = DatasetSourceConfig.model_validate(node.config)
        return self.access(context).schema(config.source_id, config.resource_id)

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        config = DatasetSourceConfig.model_validate(node.config)
        return self.access(context).load(config.source_id, config.resource_id)

    def identity(self, node: NodeInstance, context: ExecutionContext) -> str:
        config = DatasetSourceConfig.model_validate(node.config)
        return self.access(context).identity(config.source_id, config.resource_id)


def dataset_source_definition() -> NodeDefinition:
    executor = DatasetSourceExecutor()
    return NodeDefinition(
        type="dataset_source",
        version=1,
        category=NodeCategory.SOURCE,
        display_name="Prepared dataset",
        description="Read a normalized table independent of its original source.",
        input_ports=(),
        output_ports=(PortDefinition("dataset", "Dataset", PortKind.DATASET, False, None),),
        config_schema=DatasetSourceConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=executor,
        cache_identity=executor.identity,
        icon="database",
    )
