import uuid
from pathlib import Path

import polars as pl
import pytest
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes.rename_columns import RenameColumnsConfig, RenameRule, rename_columns_definition

SCHEMA = DatasetSchema(
    (
        ColumnSchema("country_id", "country", "Country", LogicalType.STRING, False),
        ColumnSchema("amount_id", "amount", "Amount", LogicalType.FLOAT, True),
    )
)


def context(session: Session, tmp_path: Path) -> ExecutionContext:
    return ExecutionContext(uuid.uuid4(), uuid.uuid4(), uuid.uuid4(), None)


def make_node(renames: list[dict[str, str]]) -> NodeInstance:
    return NodeInstance(uuid.uuid4(), "rename_columns", 1, Position(0, 0), {"renames": renames})


def test_rename_preserves_identity_type_order_and_values(session: Session, tmp_path: Path) -> None:
    node = make_node([{"column_id": "amount_id", "new_name": "Net Revenue"}])
    executor = rename_columns_definition().executor
    source = Dataset(pl.DataFrame({"country": ["Korea"], "amount": [10.5]}), SCHEMA)

    inferred = executor.infer_schema(node, {"input": SCHEMA}, context(session, tmp_path))
    result = executor.execute(node, {"input": source}, context(session, tmp_path))

    assert [column.column_id for column in inferred.columns] == ["country_id", "amount_id"]
    assert inferred.by_id("amount_id").display_name == "Net Revenue"
    assert result.frame.columns == ["country", "Net Revenue"]
    assert result.frame.to_dicts() == [{"country": "Korea", "Net Revenue": 10.5}]


@pytest.mark.parametrize(
    "renames,message",
    [
        ([{"column_id": "missing", "new_name": "Other"}], "no longer exist"),
        ([{"column_id": "amount_id", "new_name": "country"}], "duplicate output"),
    ],
)
def test_rename_validation_rejects_missing_columns_and_collisions(
    session: Session,
    tmp_path: Path,
    renames: list[dict[str, str]],
    message: str,
) -> None:
    result = rename_columns_definition().executor.validate(
        make_node(renames), {"input": SCHEMA}, context(session, tmp_path)
    )

    assert not result.valid
    assert message in result.issues[0].message


def test_rename_config_normalizes_names_and_rejects_duplicate_rules() -> None:
    config = RenameColumnsConfig(
        renames=[RenameRule(column_id="amount_id", new_name=" Net   Revenue ")]
    )
    assert config.renames[0].new_name == "Net Revenue"
    with pytest.raises(ValidationError):
        RenameColumnsConfig(
            renames=[
                RenameRule(column_id="amount_id", new_name="A"),
                RenameRule(column_id="amount_id", new_name="B"),
            ]
        )
