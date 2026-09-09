from dataclasses import replace

from pydantic import BaseModel, Field, field_validator, model_validator

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


class RenameRule(BaseModel):
    column_id: str = Field(min_length=1)
    new_name: str = Field(min_length=1, max_length=255)

    @field_validator("new_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        result = " ".join(value.split())
        if not result:
            raise ValueError("New column name cannot be blank.")
        return result


class RenameColumnsConfig(BaseModel):
    renames: list[RenameRule] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_targets(self) -> "RenameColumnsConfig":
        ids = [item.column_id for item in self.renames]
        if len(ids) != len(set(ids)):
            raise ValueError("Each column can be renamed only once.")
        return self


class RenameColumnsExecutor:
    def _config(self, node: NodeInstance) -> RenameColumnsConfig:
        return RenameColumnsConfig.model_validate(node.config)

    def _columns(self, node: NodeInstance, schema: DatasetSchema) -> tuple[ColumnSchema, ...]:
        config = self._config(node)
        available = {column.column_id: column for column in schema.columns}
        missing = [item.column_id for item in config.renames if item.column_id not in available]
        if missing:
            raise ValueError(f"Columns to rename no longer exist: {', '.join(missing)}.")
        names = {item.column_id: item.new_name for item in config.renames}
        result = tuple(
            replace(
                column,
                engine_name=names[column.column_id],
                display_name=names[column.column_id],
            )
            if column.column_id in names
            else column
            for column in schema.columns
        )
        engine_names = [column.engine_name for column in result]
        if len(engine_names) != len(set(engine_names)):
            raise ValueError("Renamed columns would create duplicate output names.")
        return result

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
                (ValidationIssue("MISSING_INPUT_SCHEMA", "Rename Columns requires an input."),)
            )
        try:
            self._columns(node, schema)
        except ValueError as exc:
            return ValidationResult((ValidationIssue("INVALID_RENAME", str(exc), "renames"),))
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
            raise ValueError("Rename Columns requires an input schema.")
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
            raise ValueError("Rename Columns requires an input dataset.")
        columns = self._columns(node, source.schema)
        rename_map = {
            original.engine_name: renamed.engine_name
            for original, renamed in zip(source.schema.columns, columns, strict=True)
            if original.engine_name != renamed.engine_name
        }
        return Dataset(
            source.frame.rename(rename_map),
            DatasetSchema(columns),
            {
                **source.metadata,
                "renamed_column_ids": [item.column_id for item in self._config(node).renames],
            },
        )


def rename_columns_definition() -> NodeDefinition:
    return NodeDefinition(
        type="rename_columns",
        version=1,
        category=NodeCategory.TRANSFORM,
        display_name="Rename Columns",
        description="Rename fields while preserving their stable identities.",
        input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
        output_ports=(
            PortDefinition(
                "dataset", "Dataset", PortKind.DATASET, required=False, max_connections=None
            ),
        ),
        config_schema=RenameColumnsConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=RenameColumnsExecutor(),
        icon="pencil",
    )
