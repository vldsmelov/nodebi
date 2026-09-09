from datetime import date, datetime

import polars as pl
import pytest

from app.domain.datasets import (
    ColumnSchema,
    Dataset,
    DatasetSchema,
    LogicalType,
    logical_to_polars,
    polars_to_logical,
)


def column(column_id: str, engine_name: str, display_name: str | None = None) -> ColumnSchema:
    return ColumnSchema(
        column_id=column_id,
        engine_name=engine_name,
        display_name=display_name or engine_name,
        logical_type=LogicalType.STRING,
        nullable=False,
    )


def test_dataset_schema_preserves_order_and_duplicate_labels() -> None:
    schema = DatasetSchema(
        (
            column("col_1", "Revenue", "Revenue"),
            column("col_2", "Revenue__2", "Revenue"),
        )
    )

    assert schema.by_id("col_2").engine_name == "Revenue__2"
    assert schema.by_name("Revenue").column_id == "col_1"
    assert len(schema.by_display_name("Revenue")) == 2
    assert schema.to_dict()["columns"][0]["column_id"] == "col_1"


def test_dataset_rejects_frame_schema_mismatch() -> None:
    with pytest.raises(ValueError, match="must match"):
        Dataset(pl.DataFrame({"different": [1]}), DatasetSchema((column("col_1", "name"),)))


@pytest.mark.parametrize(
    ("dtype", "logical"),
    [
        (pl.String, LogicalType.STRING),
        (pl.Int32, LogicalType.INTEGER),
        (pl.Float64, LogicalType.FLOAT),
        (pl.Boolean, LogicalType.BOOLEAN),
        (pl.Date, LogicalType.DATE),
        (pl.Datetime("us"), LogicalType.DATETIME),
        (pl.Null, LogicalType.UNKNOWN),
    ],
)
def test_polars_type_mapping(dtype: pl.DataType, logical: LogicalType) -> None:
    assert polars_to_logical(dtype) is logical
    assert polars_to_logical(logical_to_polars(logical)) is logical


def test_dataset_wraps_polars_without_source_specific_semantics() -> None:
    frame = pl.DataFrame(
        {"name": ["Alpha"], "date": [date(2026, 1, 1)], "at": [datetime(2026, 1, 1)]}
    )
    schema = DatasetSchema(
        (
            column("col_1", "name"),
            ColumnSchema("col_2", "date", "date", LogicalType.DATE, False),
            ColumnSchema("col_3", "at", "at", LogicalType.DATETIME, False),
        )
    )

    dataset = Dataset(frame, schema, {"source": "fixture"})

    assert dataset.row_count == 1
    assert dataset.metadata == {"source": "fixture"}
