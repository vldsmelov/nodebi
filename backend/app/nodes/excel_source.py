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
from app.domain.sources import SourceAccess
from app.domain.workbooks import WorksheetLayout
from app.domain.workflows import NodeInstance
from app.infrastructure.excel import ExcelWorkbookError


class ExcelSourceConfig(BaseModel):
    header_row: int = Field(default=1, ge=1, le=250000)
    header_rows: int = Field(default=1, ge=1, le=10)
    include_row_number: bool = False
    skip_data_rows: int = Field(default=0, ge=0, le=250000)
    drop_tail_rows: int = Field(default=0, ge=0, le=250000)
    source_id: uuid.UUID
    sheet_name: str = Field(min_length=1, max_length=255)

    def layout(self) -> WorksheetLayout:
        return WorksheetLayout(
            self.header_row,
            self.header_rows,
            self.include_row_number,
            self.skip_data_rows,
            self.drop_tail_rows,
        )


class ExcelSourceExecutor:
    def _config(self, node: NodeInstance) -> ExcelSourceConfig:
        return ExcelSourceConfig.model_validate(node.config)

    def _access(self, context: ExecutionContext) -> SourceAccess:
        if context.sources is None:
            raise ExcelWorkbookError("Source access is unavailable.")
        return context.sources

    def validate(
        self,
        node: NodeInstance,
        input_schemas: dict[str, DatasetSchema],
        context: ExecutionContext,
    ) -> ValidationResult:
        del input_schemas
        try:
            config = self._config(node)
            self._access(context).validate(config.source_id, config.sheet_name)
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
        config = self._config(node)
        return self._access(context).schema(config.source_id, config.sheet_name, config.layout())

    def execute(
        self,
        node: NodeInstance,
        inputs: dict[str, Dataset],
        context: ExecutionContext,
    ) -> Dataset:
        del inputs
        config = self._config(node)
        return self._access(context).load(config.source_id, config.sheet_name, config.layout())

    def identity(self, node: NodeInstance, context: ExecutionContext) -> str:
        config = self._config(node)
        return self._access(context).identity(config.source_id, config.sheet_name, config.layout())


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
        cache_identity=ExcelSourceExecutor().identity,
    )
