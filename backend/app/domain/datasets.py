from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

import polars as pl
from polars.datatypes import DataTypeClass


class LogicalType(StrEnum):
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class ColumnSchema:
    column_id: str
    engine_name: str
    display_name: str
    logical_type: LogicalType
    nullable: bool
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "column_id": self.column_id,
            "engine_name": self.engine_name,
            "display_name": self.display_name,
            "logical_type": self.logical_type.value,
            "nullable": self.nullable,
            "metadata": self.metadata,
        }


@dataclass(frozen=True)
class DatasetSchema:
    columns: tuple[ColumnSchema, ...]

    def __post_init__(self) -> None:
        ids = [column.column_id for column in self.columns]
        names = [column.engine_name for column in self.columns]
        if len(ids) != len(set(ids)):
            raise ValueError("Column IDs must be unique within a dataset schema.")
        if len(names) != len(set(names)):
            raise ValueError("Engine names must be unique within a dataset schema.")

    def by_id(self, column_id: str) -> ColumnSchema:
        return next(column for column in self.columns if column.column_id == column_id)

    def by_name(self, engine_name: str) -> ColumnSchema:
        return next(column for column in self.columns if column.engine_name == engine_name)

    def by_display_name(self, display_name: str) -> tuple[ColumnSchema, ...]:
        return tuple(column for column in self.columns if column.display_name == display_name)

    def to_dict(self) -> dict[str, Any]:
        return {"columns": [column.to_dict() for column in self.columns]}


@dataclass(frozen=True)
class Dataset:
    frame: pl.DataFrame
    schema: DatasetSchema
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        expected = [column.engine_name for column in self.schema.columns]
        if self.frame.columns != expected:
            raise ValueError("DataFrame columns must match the ordered dataset schema.")

    @property
    def row_count(self) -> int:
        return self.frame.height


def polars_to_logical(dtype: pl.DataType | DataTypeClass) -> LogicalType:
    if dtype == pl.Boolean:
        return LogicalType.BOOLEAN
    if dtype.is_integer():
        return LogicalType.INTEGER
    if dtype.is_float() or dtype == pl.Decimal:
        return LogicalType.FLOAT
    if dtype == pl.Date:
        return LogicalType.DATE
    if isinstance(dtype, pl.Datetime):
        return LogicalType.DATETIME
    if dtype in (pl.String, pl.Categorical, pl.Enum):
        return LogicalType.STRING
    if dtype == pl.Null:
        return LogicalType.UNKNOWN
    return LogicalType.UNKNOWN


def logical_to_polars(logical_type: LogicalType) -> pl.DataType | DataTypeClass:
    mapping: dict[LogicalType, pl.DataType | DataTypeClass] = {
        LogicalType.STRING: pl.String,
        LogicalType.INTEGER: pl.Int64,
        LogicalType.FLOAT: pl.Float64,
        LogicalType.BOOLEAN: pl.Boolean,
        LogicalType.DATE: pl.Date,
        LogicalType.DATETIME: pl.Datetime("us"),
        LogicalType.UNKNOWN: pl.Null,
    }
    return mapping[logical_type]
