import uuid
from datetime import date
from pathlib import Path

import polars as pl
import pytest
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes.filter import filter_definition

SCHEMA = DatasetSchema(
    (
        ColumnSchema("number_id", "number", "Number", LogicalType.INTEGER, True),
        ColumnSchema("text_id", "text", "Text", LogicalType.STRING, True),
        ColumnSchema("flag_id", "flag", "Flag", LogicalType.BOOLEAN, False),
        ColumnSchema("date_id", "day", "Day", LogicalType.DATE, False),
    )
)
DATASET = Dataset(
    pl.DataFrame(
        {
            "number": [1, 2, 3, None],
            "text": ["alpha", "beta", "alphabet", None],
            "flag": [True, False, True, False],
            "day": [date(2026, 1, 1), date(2026, 1, 2), date(2026, 1, 3), date(2026, 1, 4)],
        }
    ),
    SCHEMA,
)


def context(session: Session, tmp_path: Path) -> ExecutionContext:
    return ExecutionContext(uuid.uuid4(), uuid.uuid4(), uuid.uuid4(), None)


def node(*conditions: dict[str, object], **single: object) -> NodeInstance:
    configured = [*conditions, single] if single else list(conditions)
    return NodeInstance(
        uuid.uuid4(),
        "filter",
        1,
        Position(0, 0),
        {"mode": "and", "conditions": configured},
    )


@pytest.mark.parametrize(
    ("operator", "value", "expected"),
    [
        ("equals", 2, [2]),
        ("not_equals", 2, [1, 3]),
        ("greater_than", 1, [2, 3]),
        ("greater_or_equal", 2, [2, 3]),
        ("less_than", 3, [1, 2]),
        ("less_or_equal", 2, [1, 2]),
    ],
)
def test_numeric_operators(
    session: Session, tmp_path: Path, operator: str, value: object, expected: list[int]
) -> None:
    result = filter_definition().executor.execute(
        node(column_id="number_id", operator=operator, value=value),
        {"input": DATASET},
        context(session, tmp_path),
    )
    assert result.frame["number"].to_list() == expected


@pytest.mark.parametrize(
    ("operator", "value", "expected"),
    [
        ("equals", "alpha", ["alpha"]),
        ("not_equals", "alpha", ["beta", "alphabet"]),
        ("contains", "alpha", ["alpha", "alphabet"]),
        ("does_not_contain", "alpha", ["beta"]),
        ("starts_with", "bet", ["beta"]),
        ("ends_with", "bet", ["alphabet"]),
    ],
)
def test_string_operators(
    session: Session, tmp_path: Path, operator: str, value: str, expected: list[str]
) -> None:
    result = filter_definition().executor.execute(
        node(column_id="text_id", operator=operator, value=value),
        {"input": DATASET},
        context(session, tmp_path),
    )
    assert result.frame["text"].to_list() == expected


def test_null_date_and_boolean_filters_and_schema(session: Session, tmp_path: Path) -> None:
    executor = filter_definition().executor
    nulls = executor.execute(
        node(column_id="number_id", operator="is_null"),
        {"input": DATASET},
        context(session, tmp_path),
    )
    combined = executor.execute(
        node(
            {"column_id": "date_id", "operator": "greater_or_equal", "value": "2026-01-02"},
            {"column_id": "flag_id", "operator": "equals", "value": True},
        ),
        {"input": DATASET},
        context(session, tmp_path),
    )
    assert nulls.row_count == 1
    assert combined.frame["number"].to_list() == [3]
    assert (
        executor.infer_schema(
            node(column_id="number_id", operator="is_not_null"),
            {"input": SCHEMA},
            context(session, tmp_path),
        )
        is SCHEMA
    )


def test_filter_rejects_missing_column_wrong_operator_and_value(
    session: Session, tmp_path: Path
) -> None:
    executor = filter_definition().executor
    invalid_nodes = [
        node(column_id="missing", operator="equals", value="x"),
        node(column_id="number_id", operator="contains", value="1"),
        node(column_id="number_id", operator="greater_than", value="not-a-number"),
        node(column_id="number_id", operator="equals", value=1.5),
        node(column_id="text_id", operator="equals", value={"unexpected": "object"}),
    ]
    for invalid in invalid_nodes:
        assert not executor.validate(invalid, {"input": SCHEMA}, context(session, tmp_path)).valid
