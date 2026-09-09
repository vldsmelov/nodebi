from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Protocol

from app.domain.datasets import Dataset, LogicalType


@dataclass(frozen=True)
class ColumnInfo:
    column_id: str
    display_name: str
    engine_name: str
    logical_type: LogicalType
    nullable: bool


@dataclass(frozen=True)
class WorksheetInfo:
    name: str
    row_count: int | None
    column_count: int | None


@dataclass(frozen=True)
class WorkbookInfo:
    sheets: list[WorksheetInfo]


@dataclass(frozen=True)
class WorksheetLoadOptions:
    limit: int = 200


@dataclass(frozen=True)
class WorksheetPreview:
    sheet_name: str
    columns: list[ColumnInfo]
    rows: list[dict[str, Any]]
    returned_rows: int
    truncated: bool


class WorkbookReader(Protocol):
    def inspect(self, storage_key: str) -> WorkbookInfo: ...

    def preview_sheet(
        self, storage_key: str, sheet_name: str, options: WorksheetLoadOptions
    ) -> WorksheetPreview: ...

    def load_sheet(self, storage_key: str, sheet_name: str) -> Dataset: ...


CellValue = str | int | float | bool | date | datetime | None
