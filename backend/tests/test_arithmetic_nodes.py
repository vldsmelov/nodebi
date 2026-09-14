from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.formulas import FormulaValidationError, compile_formula
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry

SCHEMA = DatasetSchema(
    (
        ColumnSchema("category_id", "category", "Category", LogicalType.STRING, True),
        ColumnSchema("quantity_id", "quantity", "Quantity", LogicalType.INTEGER, True),
        ColumnSchema("price_id", "unit price", "Unit price", LogicalType.FLOAT, False),
    )
)
DATA = Dataset(
    pl.DataFrame(
        {
            "category": ["A", "B", "A", None],
            "quantity": [2, 3, None, 1],
            "unit price": [5.0, 2.0, 4.0, 8.0],
        }
    ),
    SCHEMA,
)
CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def run(kind: str, config: dict[str, object], source: Dataset = DATA) -> Dataset:
    executor = get_node_registry().get(kind, 1).executor
    return executor.execute(
        NodeInstance(uuid4(), kind, 1, Position(0, 0), config), {"input": source}, CONTEXT
    )


@pytest.mark.parametrize(
    "expression",
    [
        "__import__('os').system('whoami')",
        "quantity.__class__",
        "open('file')",
        "[x for x in quantity]",
        "lambda: 1",
        "True",
        "2 ** 999",
        "quantity // 2",
        "quantity % 2",
        "quantity > 1",
        "unknown + 1",
        "category + 1",
        "[missing]",
        "1e999",
        "(1, 2)",
        "__nodebi_0",
        "quantity[0]",
    ],
)
def test_formula_rejects_unsafe_or_invalid_expressions(expression: str) -> None:
    with pytest.raises(FormulaValidationError):
        compile_formula(expression, SCHEMA)


def test_calculated_arithmetic_identity_and_null_propagation() -> None:
    config = {"name": "revenue", "expression": "-(quantity - 1) * [price_id] / 2 + 10"}
    node = NodeInstance(uuid4(), "calculated_column", 1, Position(0, 0), config)
    executor = get_node_registry().get(node.type, 1).executor
    inferred = executor.infer_schema(node, {"input": SCHEMA}, CONTEXT)
    result = executor.execute(node, {"input": DATA}, CONTEXT)
    assert result.schema == inferred
    assert result.frame["revenue"].to_list() == [7.5, 8.0, None, 10.0]
    assert result.schema.columns[-1].metadata["source_columns"] == ["quantity_id", "price_id"]
    assert result.schema.columns[:3] == SCHEMA.columns


@pytest.mark.parametrize("expression", ["1 / 0", "0 / 0", "1e308 * 100"])
def test_non_finite_formula_is_an_explicit_error(expression: str) -> None:
    with pytest.raises(NodeExecutionError, match="non-finite"):
        run("calculated_column", {"name": "bad", "expression": expression})


def test_constant_expression_does_not_create_rows_on_empty_input() -> None:
    result = run(
        "calculated_column",
        {"name": "constant", "expression": "2"},
        Dataset(DATA.frame.head(0), SCHEMA),
    )
    assert result.row_count == 0


def test_sort_priority_nulls_and_limit() -> None:
    result = run(
        "sort",
        {
            "keys": [
                {"column_id": "category_id", "direction": "ascending"},
                {"column_id": "price_id", "direction": "descending"},
            ]
        },
    )
    assert result.frame["unit price"].to_list() == [5.0, 4.0, 2.0, 8.0]
    assert result.schema == SCHEMA
    assert run("limit", {"limit": 2}, result).frame["unit price"].to_list() == [5.0, 4.0]
    assert run("limit", {"limit": 10**100}).row_count == 4


@pytest.mark.parametrize("limit", [-1, 0, True, 1.5, "2"])
def test_invalid_limit(limit: object) -> None:
    with pytest.raises(ValueError):
        run("limit", {"limit": limit})


def test_grouped_revenue_and_global_aggregations() -> None:
    revenue = run("calculated_column", {"name": "revenue", "expression": "quantity * [price_id]"})
    revenue_id = revenue.schema.columns[-1].column_id
    result = run(
        "group_by",
        {
            "dimensions": ["category_id"],
            "aggregations": [
                {"operation": "sum", "column_id": revenue_id, "name": "total"},
                {"operation": "count", "name": "rows"},
            ],
        },
        revenue,
    )
    assert result.frame.to_dicts() == [
        {"category": "A", "total": 10.0, "rows": 2},
        {"category": "B", "total": 6.0, "rows": 1},
        {"category": None, "total": 8.0, "rows": 1},
    ]
    operations = ["count", "sum", "average", "min", "max", "distinct_count"]
    config = {
        "dimensions": [],
        "aggregations": [
            {"operation": operation, "column_id": "quantity_id", "name": operation}
            for operation in operations
        ],
    }
    assert run("group_by", config).frame.row(0) == (3, 6.0, 2.0, 1, 3, 3)
    assert run("group_by", config, Dataset(DATA.frame.head(0), SCHEMA)).frame.row(0) == (
        0,
        None,
        None,
        None,
        None,
        0,
    )


def test_group_rejects_duplicate_names_and_incompatible_types() -> None:
    with pytest.raises(ValueError):
        run(
            "group_by",
            {
                "dimensions": ["category_id"],
                "aggregations": [{"operation": "count", "name": "category"}],
            },
        )
    with pytest.raises(ValueError, match="numeric"):
        run(
            "group_by",
            {"aggregations": [{"operation": "sum", "column_id": "category_id", "name": "total"}]},
        )
