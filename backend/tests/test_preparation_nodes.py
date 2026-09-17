from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.formulas import FormulaValidationError, compile_formula
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry


def data() -> Dataset:
    return Dataset(
        pl.DataFrame(
            {
                "team": [" A ", "B", " A "],
                "text": ["2", "bad", None],
                "amount": [10.0, 20.0, 30.0],
                "order": [1, 2, 3],
            }
        ),
        DatasetSchema(
            tuple(
                ColumnSchema(key, key, key, kind, True)
                for key, kind in [
                    ("team", LogicalType.STRING),
                    ("text", LogicalType.STRING),
                    ("amount", LogicalType.FLOAT),
                    ("order", LogicalType.INTEGER),
                ]
            )
        ),
    )


def run(kind: str, config: dict[str, object], source: Dataset | None = None) -> Dataset:
    return (
        get_node_registry()
        .get(kind, 1)
        .executor.execute(
            NodeInstance(uuid4(), kind, 1, Position(0, 0), config),
            {"input": source or data()},
            ExecutionContext(uuid4(), uuid4(), uuid4()),
        )
    )


def test_explicit_conversion_and_strict_error() -> None:
    rule = {"column_id": "text", "target": "float"}
    with pytest.raises(NodeExecutionError, match="text at row 2"):
        run("convert_types", {"conversions": [rule]})
    converted = run("convert_types", {"conversions": [{**rule, "on_error": "null"}]})
    assert converted.frame["text"].to_list() == [2.0, None, None]
    assert converted.schema.by_id("text").logical_type == LogicalType.FLOAT


def test_unpivot_preserves_identity_and_full_values() -> None:
    result = run("unpivot", {"identifiers": ["team"], "columns": ["amount", "order"]})
    assert result.row_count == 6
    assert result.frame["value"].to_list() == [10.0, 20.0, 30.0, 1.0, 2.0, 3.0]
    assert result.frame["field_id"].to_list() == ["amount"] * 3 + ["order"] * 3


def test_unpivot_labels_do_not_merge_fields_or_change_identity() -> None:
    result = run(
        "unpivot",
        {
            "identifiers": ["team"],
            "columns": ["amount", "order"],
            "labels": {"amount": "Same label", "order": "Same label"},
        },
    )
    assert result.row_count == 6
    assert result.frame["field_name"].to_list() == ["Same label"] * 6
    assert result.frame["field_id"].to_list() == ["amount"] * 3 + ["order"] * 3
    assert result.schema.columns[-1].metadata["source_columns"] == ["amount", "order"]
    for labels in [{"missing": "Label"}, {"amount": "   "}, {"amount": "x" * 256}]:
        with pytest.raises(ValueError):
            run("unpivot", {"columns": ["amount"], "labels": labels})


def test_window_totals_and_rank_are_partitioned() -> None:
    result = run(
        "window",
        {"operation": "sum", "column_id": "amount", "partitions": ["team"], "name": "total"},
    )
    assert result.frame["total"].to_list() == [40.0, 20.0, 40.0]
    result = run(
        "window",
        {
            "operation": "row_number",
            "partitions": ["team"],
            "name": "rank",
            "order_by": [
                {"column_id": "amount", "direction": "descending"},
                {"column_id": "order"},
            ],
        },
    )
    assert result.frame["order"].to_list() == [3, 2, 1]
    assert result.frame["rank"].to_list() == [1, 1, 2]


@pytest.mark.parametrize(
    ("expression", "expected"),
    [
        ("lower(trim([team]))", ["a", "b", "a"]),
        ('coalesce([text], "empty")', ["2", "bad", "empty"]),
        ("safe_divide([amount], 0, 0)", [0.0, 0.0, 0.0]),
        ('"[not_a_reference]"', ["[not_a_reference]"] * 3),
        ('coalesce(nullif(trim([team]), "A"), "empty")', ["empty", "B", "empty"]),
    ],
)
def test_typed_formulas(expression: str, expected: list[object]) -> None:
    result = run("calculated_column", {"name": "output", "expression": expression})
    assert result.frame["output"].to_list() == expected


@pytest.mark.parametrize(
    "expression",
    [
        'coalesce([amount], "text")',
        "trim([amount])",
        "safe_divide([team], 1, 0)",
        'lower.__call__("x")',
    ],
)
def test_function_types_and_allowlist(expression: str) -> None:
    with pytest.raises(FormulaValidationError):
        compile_formula(expression, data().schema)
