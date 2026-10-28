"""Exact common decimal schemas/casts for row composition, never rounding or unit conversion."""

from typing import Any

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, LogicalType, logical_to_polars
from app.domain.errors import NodeExecutionError


def decimal_metadata(left: ColumnSchema, right: ColumnSchema) -> dict[str, Any]:
    fields = [field for field in (left, right) if field.logical_type == LogicalType.DECIMAL]
    return common_decimal_metadata([field.metadata for field in fields])


def common_decimal_metadata(fields: list[dict[str, Any]]) -> dict[str, Any]:
    """Common exact representation; callers supply only decimal operands."""
    scales: list[int] = []
    for field in fields:
        scale = field.get("scale")
        if type(scale) is not int or not 0 <= scale <= 38:
            raise ValueError("Combined decimal fields require explicit scales from 0 to 38.")
        scales.append(scale)
    metadata: dict[str, Any] = {"precision": 38, "scale": max(scales)}
    for key in ("unit", "currency"):
        declared = [field.get(key) for field in fields]
        known = {value for value in declared if value is not None}
        if len(known) > 1:
            raise ValueError("Combined decimal fields require compatible units and currencies.")
        if known and all(value is not None for value in declared):
            metadata[key] = declared[0]
    return metadata


def with_decimal_metadata(field: ColumnSchema, common: dict[str, Any]) -> dict[str, Any]:
    return {**{k: v for k, v in field.metadata.items() if k not in {"unit", "currency"}}, **common}


def composition_cast(source: Dataset, field: ColumnSchema, target: ColumnSchema) -> pl.Expr:
    if target.logical_type != LogicalType.DECIMAL:
        return pl.col(field.engine_name).cast(logical_to_polars(target.logical_type))
    physical = source.frame.schema[field.engine_name]
    if field.logical_type == LogicalType.DECIMAL:
        if not isinstance(physical, pl.Decimal) or physical.scale != field.metadata.get("scale"):
            raise NodeExecutionError("Combined decimal input does not match its declared scale.")
    elif source.frame[field.engine_name].null_count() != source.row_count:
        raise NodeExecutionError(
            "An unknown field combined with decimal must contain only empty values."
        )
    return pl.col(field.engine_name).cast(pl.Decimal(38, target.metadata["scale"]), strict=True)


def validate_decimal_references(source: Dataset, references: tuple[str, ...]) -> None:
    for identity in references:
        column = source.schema.by_id(identity)
        if column.logical_type == LogicalType.DECIMAL:
            common_decimal_metadata([column.metadata])
            composition_cast(source, column, column)
