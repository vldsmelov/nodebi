from datetime import date, datetime
from typing import Any
from zipfile import BadZipFile

import polars as pl
from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType, polars_to_logical
from app.domain.workbooks import (
    CellValue,
    ColumnInfo,
    WorkbookInfo,
    WorksheetInfo,
    WorksheetLoadOptions,
    WorksheetPreview,
)
from app.infrastructure.storage import StorageProvider


class ExcelWorkbookError(Exception):
    """A workbook cannot be inspected safely."""


class WorksheetNotFoundError(ExcelWorkbookError):
    """The requested worksheet is absent."""


def _logical_type(values: list[CellValue]) -> tuple[LogicalType, bool]:
    present = [value for value in values if value is not None]
    nullable = len(present) != len(values)
    if not present:
        return LogicalType.UNKNOWN, True
    value_types = {type(value) for value in present}
    if value_types <= {bool}:
        return LogicalType.BOOLEAN, nullable
    if value_types <= {int}:
        return LogicalType.INTEGER, nullable
    if value_types <= {int, float}:
        return LogicalType.FLOAT, nullable
    if value_types <= {date}:
        return LogicalType.DATE, nullable
    if value_types <= {date, datetime}:
        return LogicalType.DATETIME, nullable
    if value_types <= {str}:
        return LogicalType.STRING, nullable
    return LogicalType.STRING, nullable


def _columns(headers: tuple[Any, ...], data_rows: list[tuple[Any, ...]]) -> list[ColumnInfo]:
    seen: dict[str, int] = {}
    result: list[ColumnInfo] = []
    for index, raw_header in enumerate(headers):
        display_name = str(raw_header).strip() if raw_header is not None else ""
        display_name = display_name or f"Column {index + 1}"
        occurrence = seen.get(display_name, 0) + 1
        seen[display_name] = occurrence
        engine_name = display_name if occurrence == 1 else f"{display_name}__{occurrence}"
        values = [row[index] if index < len(row) else None for row in data_rows]
        logical_type, nullable = _logical_type(values)
        result.append(
            ColumnInfo(
                column_id=f"col_{index + 1}",
                display_name=display_name,
                engine_name=engine_name,
                logical_type=logical_type,
                nullable=nullable,
            )
        )
    return result


class OpenPyxlWorkbookReader:
    def __init__(self, storage: StorageProvider) -> None:
        self.storage = storage

    def _open_workbook(self, storage_key: str):  # type: ignore[no-untyped-def]
        stream = None
        try:
            stream = self.storage.open(storage_key)
            return stream, load_workbook(stream, read_only=True, data_only=True, keep_vba=False)
        except (BadZipFile, InvalidFileException, OSError, ValueError, KeyError) as exc:
            if stream is not None:
                stream.close()
            raise ExcelWorkbookError("The uploaded file is not a readable Excel workbook.") from exc

    def inspect(self, storage_key: str) -> WorkbookInfo:
        stream, workbook = self._open_workbook(storage_key)
        try:
            sheets = [
                WorksheetInfo(
                    name=sheet.title,
                    row_count=max(sheet.max_row - 1, 0),
                    column_count=sheet.max_column,
                )
                for sheet in workbook.worksheets
            ]
            if not sheets:
                raise ExcelWorkbookError("The workbook does not contain any worksheets.")
            return WorkbookInfo(sheets=sheets)
        finally:
            workbook.close()
            stream.close()

    def preview_sheet(
        self, storage_key: str, sheet_name: str, options: WorksheetLoadOptions
    ) -> WorksheetPreview:
        stream, workbook = self._open_workbook(storage_key)
        try:
            if sheet_name not in workbook.sheetnames:
                raise WorksheetNotFoundError(f'Worksheet "{sheet_name}" does not exist.')
            sheet = workbook[sheet_name]
            iterator = sheet.iter_rows(values_only=True)
            headers = next(iterator, ())
            if not headers or all(value is None for value in headers):
                return WorksheetPreview(sheet_name, [], [], 0, False)
            sampled = []
            for _, row in zip(range(options.limit + 1), iterator, strict=False):
                sampled.append(row)
            truncated = len(sampled) > options.limit
            data_rows = sampled[: options.limit]
            columns = _columns(headers, data_rows)
            rows = [
                {
                    column.column_id: _serialize(row[index] if index < len(row) else None)
                    for index, column in enumerate(columns)
                }
                for row in data_rows
            ]
            return WorksheetPreview(sheet_name, columns, rows, len(rows), truncated)
        finally:
            workbook.close()
            stream.close()

    def load_sheet(self, storage_key: str, sheet_name: str) -> Dataset:
        stream, workbook = self._open_workbook(storage_key)
        try:
            if sheet_name not in workbook.sheetnames:
                raise WorksheetNotFoundError(f'Worksheet "{sheet_name}" does not exist.')
            iterator = workbook[sheet_name].iter_rows(values_only=True)
            headers = next(iterator, ())
            if not headers or all(value is None for value in headers):
                return Dataset(pl.DataFrame(), DatasetSchema(()), {"sheet_name": sheet_name})
            rows = list(iterator)
            inferred = _columns(headers, rows)
            frame = pl.DataFrame(
                rows,
                schema=[column.engine_name for column in inferred],
                orient="row",
                strict=False,
            )
            columns = tuple(
                ColumnSchema(
                    column_id=column.column_id,
                    engine_name=column.engine_name,
                    display_name=column.display_name,
                    logical_type=polars_to_logical(frame.schema[column.engine_name]),
                    nullable=frame[column.engine_name].null_count() > 0,
                    metadata={"source_position": index},
                )
                for index, column in enumerate(inferred)
            )
            return Dataset(
                frame=frame,
                schema=DatasetSchema(columns),
                metadata={"sheet_name": sheet_name},
            )
        finally:
            workbook.close()
            stream.close()


def _serialize(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value
