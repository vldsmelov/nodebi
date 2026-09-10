from datetime import date, datetime
from typing import Any
from zipfile import BadZipFile, ZipFile

import polars as pl
from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from app.domain.datasets import (
    ColumnSchema,
    Dataset,
    DatasetSchema,
    LogicalType,
    logical_to_polars,
)
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
    used: set[str] = set()
    labels = [
        (str(value).strip() if value is not None else "") or f"Column {index + 1}"
        for index, value in enumerate(headers)
    ]
    reserved = set(labels)
    result: list[ColumnInfo] = []
    for index, raw_header in enumerate(headers):
        display_name = str(raw_header).strip() if raw_header is not None else ""
        display_name = display_name or f"Column {index + 1}"
        engine_name = display_name
        occurrence = 2
        while engine_name in used:
            engine_name = f"{display_name}__{occurrence}"
            occurrence += 1
            if engine_name in reserved:
                engine_name = display_name
        used.add(engine_name)
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
            with ZipFile(stream) as archive:
                if (
                    len(archive.infolist()) > 10_000
                    or sum(member.file_size for member in archive.infolist()) > 256 * 1024 * 1024
                ):
                    raise ValueError("Workbook expanded size exceeds the supported limit.")
            stream.seek(0)
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
                    row_count=max((sheet.max_row or 1) - 1, 0),
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
            sampled = []
            for _, row in zip(range(options.limit + 1), iterator, strict=False):
                sampled.append(row)
            if not headers or (all(value is None for value in headers) and not sampled):
                return WorksheetPreview(sheet_name, [], [], 0, False)
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
            if len(headers) > 1024:
                raise ExcelWorkbookError("Worksheet exceeds the 1024-column limit.")
            rows: list[tuple[Any, ...]] = []
            for row in iterator:
                if len(rows) >= 250_000 or (len(rows) + 1) * len(headers) > 2_000_000:
                    raise ExcelWorkbookError(
                        "Worksheet exceeds the 250000-row or 2000000-cell limit."
                    )
                rows.append(row)
            if not headers or (all(value is None for value in headers) and not rows):
                return Dataset(pl.DataFrame(), DatasetSchema(()), {"sheet_name": sheet_name})
            inferred = _columns(headers, rows)
            # Polars' row inference samples a prefix. Our logical inference examines
            # all rows and explicitly normalizes mixed values before construction.
            frame = pl.DataFrame(
                [
                    pl.Series(
                        column.engine_name,
                        [_coerce(row[index], column.logical_type) for row in rows],
                        dtype=logical_to_polars(column.logical_type),
                        strict=True,
                    )
                    for index, column in enumerate(inferred)
                ]
            )
            columns = tuple(
                ColumnSchema(
                    column_id=column.column_id,
                    engine_name=column.engine_name,
                    display_name=column.display_name,
                    logical_type=column.logical_type,
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


def _coerce(value: Any, logical_type: LogicalType) -> Any:
    if value is None:
        return None
    if logical_type == LogicalType.STRING:
        return str(_serialize(value))
    if logical_type == LogicalType.FLOAT:
        return float(value)
    if logical_type == LogicalType.DATETIME and type(value) is date:
        return datetime.combine(value, datetime.min.time())
    return value
