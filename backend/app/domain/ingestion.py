"""Source-neutral ingestion contracts. Reading options belong to their adapters."""

from collections.abc import Iterator
from typing import Any, Literal, Protocol, Self
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.datasets import Dataset, DatasetSchema, LogicalType
from app.domain.workbooks import cell_range_bounds


class ConnectorDefinition(BaseModel):
    type: str
    version: int = 1
    name: str
    status: Literal["available", "planned"] = "available"
    capabilities: list[Literal["file", "resources", "batch_read", "schema", "http", "odata"]]
    extensions: list[str] = Field(default_factory=list)


class SourceResource(BaseModel):
    id: str
    name: str
    kind: Literal["worksheet", "table", "entity"]
    row_count: int | None = None


class ReadOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")
    encoding: Literal["utf-8-sig", "cp1251", "utf-16"] = "utf-8-sig"
    delimiter: Literal[",", ";", "\t", "|"] = ","
    header_row: int = Field(default=1, ge=1, le=250000)
    header_rows: int = Field(default=1, ge=1, le=10)
    skip_data_rows: int = Field(default=0, ge=0, le=250000)
    drop_tail_rows: int = Field(default=0, ge=0, le=250000)
    cell_range: str | None = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def valid_range(self) -> Self:
        if self.cell_range is not None:
            self.cell_range = self.cell_range.strip().upper()
            _, top, _, bottom = cell_range_bounds(self.cell_range)
            if top + self.header_rows - 1 > bottom:
                raise ValueError("Header rows must fit inside the selected range.")
        return self


class ImportField(BaseModel):
    model_config = ConfigDict(extra="forbid")
    field_id: str = Field(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9_-]+$")
    source_field: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=255)
    logical_type: LogicalType
    nullable: bool = True
    unit: str | None = Field(default=None, max_length=80)
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    precision: int = Field(default=38, ge=1, le=38)
    scale: int = Field(default=2, ge=0, le=38)
    timezone: str | None = Field(default=None, max_length=80)
    error_policy: Literal["reject", "null"] = "reject"
    decimal_separator: Literal[".", ","] = "."
    date_format: Literal["iso", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y"] = "iso"

    @model_validator(mode="after")
    def valid(self) -> Self:
        if not self.name.strip():
            raise ValueError("Field name must not be blank.")
        if self.logical_type == LogicalType.DECIMAL and self.scale > self.precision:
            raise ValueError("Decimal scale must not exceed precision.")
        if self.error_policy == "null" and not self.nullable:
            raise ValueError("Replacing conversion errors with null requires a nullable field.")
        if self.timezone:
            if self.logical_type != LogicalType.DATETIME:
                raise ValueError("A time zone applies only to datetime fields.")
            try:
                ZoneInfo(self.timezone)
            except ZoneInfoNotFoundError as exc:
                raise ValueError("Choose a valid IANA time zone.") from exc
        return self


class ImportProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    resource_id: str = Field(min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=200)
    grain: str = Field(default="", max_length=1000)
    options: ReadOptions = Field(default_factory=ReadOptions)
    fields: list[ImportField] = Field(min_length=1, max_length=1024)
    key_fields: list[str] = Field(default_factory=list, max_length=32)

    @model_validator(mode="after")
    def unique_fields(self) -> Self:
        for values in (
            [f.field_id for f in self.fields],
            [f.name for f in self.fields],
            [f.source_field for f in self.fields],
            self.key_fields,
        ):
            if len(values) != len(set(values)):
                raise ValueError("Field identities, names and mappings must be unique.")
        if not set(self.key_fields) <= {f.field_id for f in self.fields}:
            raise ValueError("Keys must reference mapped fields.")
        return self


class ImportIssue(BaseModel):
    code: str
    field_id: str | None = None
    row: int | None = None
    message: str
    severity: Literal["error", "warning"] = "error"


class ImportPreview(BaseModel):
    profile: ImportProfile
    columns: list[dict[str, Any]]
    rows: list[dict[str, Any]]
    total_rows: int
    returned_rows: int
    checked_rows: int
    issue_count: int
    issues: list[ImportIssue]
    can_apply: bool


class SourceAdapter(Protocol):
    definition: ConnectorDefinition

    def discover(self, storage_key: str, options: ReadOptions) -> list[SourceResource]: ...
    def schema(self, storage_key: str, resource_id: str, options: ReadOptions) -> DatasetSchema: ...
    def read_batches(
        self, storage_key: str, resource_id: str, options: ReadOptions, batch_size: int = 10000
    ) -> Iterator[Dataset]: ...
