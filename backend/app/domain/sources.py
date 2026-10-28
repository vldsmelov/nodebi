import uuid
from typing import Protocol

from app.domain.datasets import Dataset, DatasetSchema
from app.domain.workbooks import DEFAULT_WORKSHEET_LAYOUT, WorksheetLayout


class SourceAccess(Protocol):
    """Legacy worksheet access. New normalized sources use the DatasetAccess contract."""

    def validate(self, source_id: uuid.UUID, sheet_name: str) -> None: ...
    def identity(
        self,
        source_id: uuid.UUID,
        sheet_name: str,
        layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT,
    ) -> str: ...
    def schema(
        self,
        source_id: uuid.UUID,
        sheet_name: str,
        layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT,
    ) -> DatasetSchema: ...
    def load(
        self,
        source_id: uuid.UUID,
        sheet_name: str,
        layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT,
    ) -> Dataset: ...
