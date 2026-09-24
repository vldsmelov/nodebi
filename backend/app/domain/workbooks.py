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
class WorksheetLayout:
    header_row: int = 1
    header_rows: int = 1
    include_row_number: bool = False
    skip_data_rows: int = 0
    drop_tail_rows: int = 0

    def __post_init__(self) -> None:
        if not 0 <= self.skip_data_rows <= 250000 or not 0 <= self.drop_tail_rows <= 250000:
            raise ValueError("Skipped row counts must be between 0 and 250000.")
        if not 1 <= self.header_row <= 250_000 or not 1 <= self.header_rows <= 10:
            raise ValueError("Header row must be 1–250000; header count must be 1–10.")


DEFAULT_WORKSHEET_LAYOUT = WorksheetLayout()


@dataclass(frozen=True)
class WorksheetLoadOptions:
    limit: int = 200
    layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT


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

    def load_sheet(
        self, storage_key: str, sheet_name: str, layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT
    ) -> Dataset: ...


CellValue = str | int | float | bool | date | datetime | None
