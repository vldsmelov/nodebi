from abc import ABC, abstractmethod

from pydantic import BaseModel

from app.domain.datasets import Dataset, DatasetSchema
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    NodeExecutor,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
    ValidationIssue,
    ValidationResult,
)
from app.domain.workflows import NodeInstance


class UnaryExecutor(ABC):
    def validate(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> ValidationResult:
        try:
            self.infer_schema(node, input_schemas, context)
        except (ValueError, KeyError, StopIteration) as exc:
            return ValidationResult(
                (
                    ValidationIssue(
                        f"INVALID_{node.type.upper()}",
                        str(exc) or "A selected field is missing.",
                        "config",
                    ),
                )
            )
        return ValidationResult()

    @abstractmethod
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema: ...

    @abstractmethod
    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset: ...


def input_schema(schemas: dict[str, DatasetSchema]) -> DatasetSchema:
    if "input" not in schemas:
        raise ValueError("Connect an upstream dataset first.")
    return schemas["input"]


def unary_definition(
    node_type: str, name: str, description: str, config: type[BaseModel], executor: NodeExecutor
) -> NodeDefinition:
    return NodeDefinition(
        type=node_type,
        version=1,
        category=NodeCategory.TRANSFORM,
        display_name=name,
        description=description,
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(PortDefinition("dataset", "Dataset", PortKind.DATASET, False, None),),
        config_schema=config,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=executor,
    )
