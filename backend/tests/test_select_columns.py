import uuid
from pathlib import Path

import polars as pl
import pytest
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.infrastructure.storage import LocalStorageProvider
from app.nodes.select_columns import SelectColumnsConfig, select_columns_definition

SCHEMA = DatasetSchema(
    (
        ColumnSchema("country_id", "country", "Country", LogicalType.STRING, False),
        ColumnSchema("amount_id", "amount", "Amount", LogicalType.FLOAT, True),
        ColumnSchema("year_id", "year", "Year", LogicalType.INTEGER, False),
    )
)


def context(session: Session, tmp_path: Path) -> ExecutionContext:
    return ExecutionContext(
        uuid.uuid4(),
        uuid.uuid4(),
        uuid.uuid4(),
        session,
        LocalStorageProvider(tmp_path),
    )


def test_select_columns_preserves_configured_order(session: Session, tmp_path: Path) -> None:
    node = NodeInstance(
        uuid.uuid4(),
        "select_columns",
        1,
        Position(0, 0),
        {"column_ids": ["year_id", "country_id"]},
    )
    executor = select_columns_definition().executor
    dataset = Dataset(
        pl.DataFrame({"country": ["Korea"], "amount": [10.5], "year": [2026]}),
        SCHEMA,
    )

    inferred = executor.infer_schema(node, {"input": SCHEMA}, context(session, tmp_path))
    result = executor.execute(node, {"input": dataset}, context(session, tmp_path))

    assert [column.column_id for column in inferred.columns] == ["year_id", "country_id"]
    assert result.frame.columns == ["year", "country"]
    assert result.frame.to_dicts() == [{"year": 2026, "country": "Korea"}]


def test_select_columns_rejects_missing_and_duplicate_fields(
    session: Session, tmp_path: Path
) -> None:
    node = NodeInstance(
        uuid.uuid4(),
        "select_columns",
        1,
        Position(0, 0),
        {"column_ids": ["removed_id"]},
    )
    validation = select_columns_definition().executor.validate(
        node, {"input": SCHEMA}, context(session, tmp_path)
    )

    assert not validation.valid
    assert validation.issues[0].code == "MISSING_SELECTED_COLUMN"
    with pytest.raises(ValidationError):
        SelectColumnsConfig(column_ids=["country_id", "country_id"])
