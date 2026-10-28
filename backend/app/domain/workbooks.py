import re
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


def cell_range_bounds(value: str) -> tuple[int, int, int, int]:
    match = re.fullmatch(r"([A-Z]{1,3})([1-9][0-9]{0,5}):([A-Z]{1,3})([1-9][0-9]{0,5})", value)
    if not match:
        raise ValueError("Use an Excel cell range such as B2:F100.")

    def column(label: str) -> int:
        result = 0
        for letter in label:
            result = result * 26 + ord(letter) - ord("A") + 1
        return result

    left, top, right, bottom = (column(match[1]), int(match[2]), column(match[3]), int(match[4]))
    if not (left <= right <= 16384 and top <= bottom <= 250000 and right - left < 1024):
        raise ValueError("Choose an ordered range within 250000 rows and 1024 selected columns.")
    return left, top, right, bottom


@dataclass(frozen=True)
class WorksheetLayout:
    header_row: int = 1
    header_rows: int = 1
    include_row_number: bool = False
    skip_data_rows: int = 0
    drop_tail_rows: int = 0
    cell_range: str | None = None

    def __post_init__(self) -> None:
        if self.cell_range:
            _, top, _, bottom = cell_range_bounds(self.cell_range)
            if top + self.header_rows - 1 > bottom:
                raise ValueError("Header rows must fit inside the selected range.")
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
