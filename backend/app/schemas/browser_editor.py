import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.workbook_formats import CellFormatPatch


class EditorColumn(BaseModel):
    index: int
    name: str
    description: str
    date_format: str | None = None
    decimal_separator: str | None = None


class EditorRow(BaseModel):
    id: str
    values: list[str]
    readonly: list[int] = Field(default_factory=list)
    formulas: dict[int, str] = Field(default_factory=dict)
    style_ids: dict[int, int] = Field(default_factory=dict)
    editable_in_workbook_mode: list[int] = Field(default_factory=list)
    pending_formulas: list[int] = Field(default_factory=list)
    number_values: dict[int, str] = Field(default_factory=dict)
    formats: dict[int, CellFormatPatch] = Field(default_factory=dict)
    format_readonly: list[int] = Field(default_factory=list)


class EditorPage(BaseModel):
    revision: int
    resource_id: str
    resources: list[str]
    columns: list[EditorColumn]
    rows: list[EditorRow]
    total_rows: int
    offset: int
    limit: int
    pending: bool
    workbook: bool = False
    can_change_rows: bool = True
    external_cached_values: bool = False
    precision_as_displayed: bool = False
    date_1904: bool | None = None
    can_format: bool = False


class EditorCell(BaseModel):
    model_config = ConfigDict(extra="forbid")
    row_id: str = Field(min_length=1, max_length=40)
    column: int = Field(ge=0, le=1023, strict=True)
    value: str = Field(max_length=10000)
    formula: bool = False
    override_protection: bool = False


class EditorFormatCell(BaseModel):
    model_config = ConfigDict(extra="forbid")
    row_id: str = Field(min_length=1, max_length=40)
    column: int = Field(ge=0, le=1023, strict=True)
    patch: CellFormatPatch
    override_protection: bool = False


class EditorSave(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=1)
    request_id: uuid.UUID
    resource_id: str = Field(min_length=1, max_length=255)
    cells: list[EditorCell] = Field(default_factory=list, max_length=2000)
    formats: list[EditorFormatCell] = Field(default_factory=list, max_length=2000)
    append_rows: list[uuid.UUID] = Field(default_factory=list, max_length=100)
    delete_rows: list[str] = Field(default_factory=list, max_length=100)
    restore_rows: list[str] = Field(default_factory=list, max_length=100)


class EditorAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=1)
    request_id: uuid.UUID


class CellBorder(BaseModel):
    line: str
    color: str


class CellAppearance(BaseModel):
    font: str = "Arial"
    size: float = 11
    bold: bool = False
    italic: bool = False
    color: str | None = None
    background: str | None = None
    alignment: str = "general"
    wrap: bool = False
    number_format: str = "General"
    borders: dict[Literal["top", "right", "bottom", "left"], CellBorder] = Field(
        default_factory=dict
    )


class SheetAppearance(BaseModel):
    name: str
    rows: int
    columns: int
    widths: dict[int, float] = Field(default_factory=dict)
    heights: dict[int, float] = Field(default_factory=dict)
    merges: list[tuple[int, int, int, int]] = Field(default_factory=list)


class EditorWorkspace(BaseModel):
    page: EditorPage
    sheets: list[SheetAppearance]
    styles: list[CellAppearance] = Field(default_factory=list)


class EditorMatch(BaseModel):
    row: int
    column: int


class EditorSearch(BaseModel):
    cells: list[EditorMatch]
