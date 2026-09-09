import uuid

from pydantic import BaseModel, Field

from app.domain.datasets import Dataset, DatasetSchema
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
from app.infrastructure.excel import ExcelWorkbookError, OpenPyxlWorkbookReader
from app.models import DataSource


class ExcelSourceConfig(BaseModel):
    source_id: uuid.UUID
    sheet_name: str = Field(min_length=1, max_length=255)


class ExcelSourceExecutor:
    def _config(self, node: NodeInstance) -> ExcelSourceConfig:
        return ExcelSourceConfig.model_validate(node.config)

    def _source(self, node: NodeInstance, context: ExecutionContext) -> DataSource:
        config = self._config(node)
        source = (
            context.source_repository.get(config.source_id)
            if context.source_repository
            else context.session.get(DataSource, config.source_id)
        )
        if source is None or source.project_id != context.project_id:
            raise ExcelWorkbookError("The configured Excel source does not exist in this project.")
        return source

    def validate(
        self,
        node: NodeInstance,
        input_schemas: dict[str, DatasetSchema],
        context: ExecutionContext,
    ) -> ValidationResult:
        del input_schemas
        try:
            source = self._source(node, context)
            config = self._config(node)
            info = OpenPyxlWorkbookReader(context.storage).inspect(source.storage_key)
            if config.sheet_name not in {sheet.name for sheet in info.sheets}:
                return ValidationResult(
                    (
                        ValidationIssue(
                            "WORKSHEET_NOT_FOUND",
                            "Configured worksheet does not exist.",
                            "sheet_name",
                        ),
                    )
                )
        except (ExcelWorkbookError, ValueError) as exc:
            return ValidationResult((ValidationIssue("INVALID_EXCEL_SOURCE", str(exc)),))
        return ValidationResult()

    def infer_schema(
        self,
        node: NodeInstance,
        input_schemas: dict[str, DatasetSchema],
        context: ExecutionContext,
    ) -> DatasetSchema:
        del input_schemas
        source = self._source(node, context)
        config = self._config(node)
        return (
            OpenPyxlWorkbookReader(context.storage)
            .load_sheet(source.storage_key, config.sheet_name)
            .schema
        )

    def execute(
        self,
        node: NodeInstance,
        inputs: dict[str, Dataset],
        context: ExecutionContext,
    ) -> Dataset:
        del inputs
        source = self._source(node, context)
        config = self._config(node)
        return OpenPyxlWorkbookReader(context.storage).load_sheet(
            source.storage_key, config.sheet_name
        )


def excel_source_definition() -> NodeDefinition:
    return NodeDefinition(
        type="excel_source",
        version=1,
        category=NodeCategory.SOURCE,
        display_name="Excel Source",
        description="Load a worksheet from an uploaded Excel workbook.",
        input_ports=(),
        output_ports=(
            PortDefinition(
                "dataset", "Dataset", PortKind.DATASET, required=False, max_connections=None
            ),
        ),
        config_schema=ExcelSourceConfig,
        schema_inference_mode=SchemaInferenceMode.STATIC,
        executor=ExcelSourceExecutor(),
        icon="file-spreadsheet",
    )
