from pydantic import BaseModel, Field, field_validator

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
    ValidationIssue,
    ValidationResult,
)
from app.domain.workflows import NodeInstance


class SelectColumnsConfig(BaseModel):
    column_ids: list[str] = Field(min_length=1)

    @field_validator("column_ids")
    @classmethod
    def unique_columns(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("Selected columns must be unique.")
        return value


class SelectColumnsExecutor:
    def _config(self, node: NodeInstance) -> SelectColumnsConfig:
        return SelectColumnsConfig.model_validate(node.config)

    def _columns(self, node: NodeInstance, schema: DatasetSchema) -> tuple[ColumnSchema, ...]:
        config = self._config(node)
        available = {column.column_id: column for column in schema.columns}
        missing = [column_id for column_id in config.column_ids if column_id not in available]
        if missing:
            raise ValueError(f"Selected columns no longer exist: {', '.join(missing)}.")
        return tuple(available[column_id] for column_id in config.column_ids)

    def validate(
        self,
        node: NodeInstance,
        input_schemas: dict[str, DatasetSchema],
        context: ExecutionContext,
    ) -> ValidationResult:
        del context
        schema = input_schemas.get("input")
        if schema is None:
            return ValidationResult(
                (ValidationIssue("MISSING_INPUT_SCHEMA", "Select Columns requires an input."),)
            )
        try:
            self._columns(node, schema)
        except ValueError as exc:
            return ValidationResult(
                (ValidationIssue("MISSING_SELECTED_COLUMN", str(exc), "column_ids"),)
            )
        return ValidationResult()

    def infer_schema(
        self,
        node: NodeInstance,
        input_schemas: dict[str, DatasetSchema],
        context: ExecutionContext,
    ) -> DatasetSchema:
        del context
        schema = input_schemas.get("input")
        if schema is None:
            raise ValueError("Select Columns requires an input schema.")
        return DatasetSchema(self._columns(node, schema))

    def execute(
        self,
        node: NodeInstance,
        inputs: dict[str, Dataset],
        context: ExecutionContext,
    ) -> Dataset:
        del context
        source = inputs.get("input")
        if source is None:
            raise ValueError("Select Columns requires an input dataset.")
        columns = self._columns(node, source.schema)
        return Dataset(
            source.frame.select([column.engine_name for column in columns]),
            DatasetSchema(columns),
            {**source.metadata, "selected_column_ids": self._config(node).column_ids},
        )


def select_columns_definition() -> NodeDefinition:
    return NodeDefinition(
        type="select_columns",
        version=1,
        category=NodeCategory.TRANSFORM,
        display_name="Select Columns",
        description="Keep selected fields in a chosen order.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(
            PortDefinition(
                "dataset", "Dataset", PortKind.DATASET, required=False, max_connections=None
            ),
        ),
        config_schema=SelectColumnsConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=SelectColumnsExecutor(),
        icon="list-filter",
    )
