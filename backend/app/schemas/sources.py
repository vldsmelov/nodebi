import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.domain.datasets import LogicalType


class WorksheetInfoRead(BaseModel):
    name: str
    row_count: int | None
    column_count: int | None


class WorkbookInfoRead(BaseModel):
    sheets: list[WorksheetInfoRead]


class DataSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    type: str
    name: str
    original_filename: str
    file_size: int
    status: str
    workbook: WorkbookInfoRead
    created_at: datetime
    updated_at: datetime


class DataSourceList(BaseModel):
    items: list[DataSourceRead]


class ColumnInfoRead(BaseModel):
    column_id: str
    display_name: str
    engine_name: str
    logical_type: LogicalType
    nullable: bool


class WorksheetPreviewRead(BaseModel):
    sheet_name: str
    columns: list[ColumnInfoRead]
    rows: list[dict[str, Any]]
    returned_rows: int
    truncated: bool
