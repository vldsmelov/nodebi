"""Explicit, strict conversion with exact numeric transport and bounded diagnostics."""

import math
import re
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation, localcontext
from typing import Any
from zoneinfo import ZoneInfo

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType, logical_to_polars
from app.domain.ingestion import ImportField, ImportIssue, ImportPreview, ImportProfile, ReadOptions


def transport_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, int) and not isinstance(value, bool) and abs(value) > 9007199254740991:
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def transport_rows(frame: pl.DataFrame) -> list[dict[str, Any]]:
    return [
        {key: transport_value(value) for key, value in row.items()}
        for row in frame.iter_rows(named=True)
    ]


def suggest_profile(
    source_id: uuid.UUID, resource_id: str, name: str, options: ReadOptions, data: Dataset
) -> ImportProfile:
    fields = []
    for column in data.schema.columns:
        values = data.frame[column.engine_name].drop_nulls()
        dtype = column.logical_type
        if dtype == LogicalType.STRING and len(values):
            texts = values.cast(pl.String).to_list()
            # Codes and mixed data stay text; suggestions never strip leading zeros.
            if all(
                re.fullmatch(r"-?(0|[1-9][0-9]*)", item) and -(2**63) <= int(item) < 2**63
                for item in texts
            ):
                dtype = LogicalType.INTEGER
            elif all(item.lower() in {"true", "false"} for item in texts):
                dtype = LogicalType.BOOLEAN
            elif all(re.fullmatch(r"-?(0|[1-9][0-9]*)\.[0-9]+", item) for item in texts):
                dtype = LogicalType.DECIMAL
        scale = (
            max((len(str(v).split(".", 1)[1]) if "." in str(v) else 0 for v in values), default=2)
            if dtype == LogicalType.DECIMAL
            else 2
        )
        fields.append(
            ImportField(
                field_id=uuid.uuid5(source_id, f"{resource_id}:{column.column_id}").hex,
                source_field=column.column_id,
                name=column.engine_name
                if column.logical_type != LogicalType.STRING
                else column.display_name,
                logical_type=dtype,
                scale=min(scale, 38),
            )
        )
    # Duplicate labels need distinct names; their original field identities are retained.
    used: set[str] = set()
    for field in fields:
        base_name = field.name
        index = 2
        while field.name in used:
            field.name = f"{base_name} ({index})"
            index += 1
        used.add(field.name)
    return ImportProfile(
        resource_id=resource_id, name=name[:200] or resource_id, options=options, fields=fields
    )


def convert_input_value(value: Any, field: ImportField) -> Any:
    if value is None:
        if not field.nullable:
            raise ValueError("A required value is missing.")
        return None
    text = str(value)
    dtype = field.logical_type
    if dtype == LogicalType.STRING:
        return text
    if dtype == LogicalType.UNKNOWN:
        raise ValueError("Choose a type for a non-empty field.")
    if dtype == LogicalType.BOOLEAN:
        if isinstance(value, bool):
            return value
        if text.lower() not in {"true", "false"}:
            raise ValueError("Expected true or false.")
        return text.lower() == "true"
    if dtype in {LogicalType.INTEGER, LogicalType.FLOAT, LogicalType.DECIMAL}:
        if isinstance(value, bool):
            raise ValueError("Boolean values are not numeric values.")
        if field.decimal_separator == ",":
            if "." in text:
                raise ValueError("The value does not use the selected decimal separator.")
            text = text.replace(",", ".")
        number = Decimal(text)
        if not number.is_finite():
            raise ValueError("The number must be finite.")
        if dtype == LogicalType.INTEGER:
            if number != number.to_integral_value() or not -(2**63) <= number < 2**63:
                raise ValueError("Expected an integer within the signed 64-bit range.")
            return int(number)
        if dtype == LogicalType.FLOAT:
            result = float(number)
            if not math.isfinite(result):
                raise ValueError("The number exceeds the float range.")
            return result
        with localcontext() as context:
            context.prec = 80
            quantized = number.quantize(Decimal(1).scaleb(-field.scale))
            if quantized != number or abs(quantized) >= Decimal(10) ** (
                field.precision - field.scale
            ):
                raise ValueError("The value does not fit the selected decimal precision and scale.")
            return quantized
    if dtype == LogicalType.DATE:
        if isinstance(value, datetime):
            if value.time().isoformat() != "00:00:00":
                raise ValueError("Datetime contains a time; choose datetime to retain it.")
            return value.date()
        return (
            date.fromisoformat(text)
            if field.date_format == "iso"
            else datetime.strptime(text, field.date_format).date()
        )
    moment = (
        datetime.fromisoformat(text)
        if field.date_format == "iso"
        else datetime.strptime(text, field.date_format)
    )
    if field.timezone:
        zone = ZoneInfo(field.timezone)
        if moment.tzinfo is None:
            first, second = moment.replace(tzinfo=zone, fold=0), moment.replace(tzinfo=zone, fold=1)
            if (
                first.utcoffset() != second.utcoffset()
                or first.astimezone(UTC).astimezone(zone).replace(tzinfo=None) != moment
            ):
                raise ValueError(
                    "Ambiguous or nonexistent local time; provide an explicit UTC offset."
                )
            moment = first
        return moment.astimezone(zone)
    if moment.tzinfo is not None:
        raise ValueError("Choose a time zone for values with an explicit UTC offset.")
    return moment


def _fast_decimal_series(values: pl.Series, field: ImportField) -> pl.Series | None:
    """Prove representability before native casting, which otherwise truncates scale.

    Only plain ASCII decimal strings use this path. Any other syntax or invalid value
    returns the entire column to the scalar converter, retaining exact row diagnostics.
    """
    if values.dtype != pl.String or field.logical_type != LogicalType.DECIMAL:
        return None
    if not field.nullable and values.null_count():
        return None
    integer_digits = field.precision - field.scale
    integer = rf"(?:0|[1-9][0-9]{{0,{integer_digits - 1}}})" if integer_digits else "0"
    fraction = rf"[0-9]{{1,{field.scale}}}0*" if field.scale else "0+"
    separator = re.escape(field.decimal_separator)
    pattern = rf"\A-?{integer}(?:{separator}{fraction})?\z"
    if not values.str.contains(pattern).all():
        return None
    canonical = (
        values.str.replace_all(",", ".", literal=True) if field.decimal_separator == "," else values
    )
    try:
        return canonical.cast(pl.Decimal(field.precision, field.scale), strict=True)
    except (pl.exceptions.InvalidOperationError, pl.exceptions.ComputeError):
        # Native parser limitations must not change the accepted Decimal syntax.
        return None


def normalize(
    data: Dataset, profile: ImportProfile, limit: int = 50
) -> tuple[Dataset, ImportPreview]:
    columns: list[ColumnSchema] = []
    series: list[pl.Series] = []
    issues: list[ImportIssue] = []
    issue_count = 0
    errors = 0
    for field in profile.fields:
        try:
            original = data.schema.by_id(field.source_field)
        except StopIteration as exc:
            raise ValueError(f"Mapped source field is missing: {field.source_field}.") from exc
        source_values = data.frame[original.engine_name]
        converted = _fast_decimal_series(source_values, field)
        if converted is None:
            values = []
            for row, value in enumerate(source_values, 1):
                try:
                    values.append(convert_input_value(value, field))
                except (ValueError, InvalidOperation, OverflowError) as exc:
                    values.append(None)
                    issue_count += 1
                    errors += field.error_policy == "reject"
                    if len(issues) < 100:
                        issues.append(
                            ImportIssue(
                                code="CONVERSION_ERROR",
                                field_id=field.field_id,
                                row=row,
                                message=str(exc) or "Invalid value.",
                                severity="error" if field.error_policy == "reject" else "warning",
                            )
                        )
            dtype = (
                pl.Decimal(field.precision, field.scale)
                if field.logical_type == LogicalType.DECIMAL
                else pl.Datetime("us", field.timezone)
                if field.logical_type == LogicalType.DATETIME
                else logical_to_polars(field.logical_type)
            )
            converted = pl.Series(field.field_id, values, dtype=dtype)
        series.append(converted.rename(field.field_id))
        columns.append(
            ColumnSchema(
                field.field_id,
                field.field_id,
                field.name,
                field.logical_type,
                field.nullable,
                {
                    "source_field": field.source_field,
                    "unit": field.unit,
                    "currency": field.currency,
                    "precision": field.precision,
                    "scale": field.scale,
                    "timezone": field.timezone,
                },
            )
        )
    frame = pl.DataFrame(series)
    if profile.key_fields and (
        frame.select(profile.key_fields).is_duplicated().any()
        or any(frame[key].null_count() for key in profile.key_fields)
    ):
        errors += 1
        issue_count += 1
        issues.append(
            ImportIssue(code="INVALID_KEY", message="Key fields must be non-null and unique.")
        )
    result = Dataset(
        frame,
        DatasetSchema(tuple(columns)),
        {"grain": profile.grain, "key_fields": profile.key_fields},
    )
    return result, ImportPreview(
        profile=profile,
        columns=[c.to_dict() for c in columns],
        rows=transport_rows(frame.head(limit)),
        total_rows=data.row_count,
        returned_rows=min(limit, data.row_count),
        checked_rows=data.row_count,
        issue_count=issue_count,
        issues=issues,
        can_apply=errors == 0,
    )
