from dataclasses import replace
from decimal import Decimal, localcontext
from pathlib import Path
from uuid import uuid4

import polars as pl
import pytest
from sqlalchemy.engine import Engine

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.exact_formulas import compile_exact_formula
from app.domain.formulas import FormulaValidationError
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry
from tests.test_report_editing import example, save_workflow

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())
SCHEMA = DatasetSchema(
    (
        ColumnSchema(
            "amount_id",
            "amount",
            "Amount",
            LogicalType.DECIMAL,
            True,
            {"precision": 38, "scale": 2},
        ),
        ColumnSchema("quantity_id", "quantity", "Quantity", LogicalType.INTEGER, True),
        ColumnSchema("float_id", "approximate", "Approximate", LogicalType.FLOAT, False),
    )
)
DATA = Dataset(
    pl.DataFrame(
        {
            "amount": pl.Series(
                [Decimal("9007199254740993.11"), Decimal("0.01"), None], dtype=pl.Decimal(38, 2)
            ),
            "quantity": [3, 0, None],
            "approximate": [0.1, 0.2, 0.3],
        }
    ),
    SCHEMA,
)


def run(expression: str, data: Dataset = DATA, **settings: object) -> Dataset:
    node = NodeInstance(
        uuid4(),
        "calculated_column",
        2,
        Position(0, 0),
        {"name": "result", "expression": expression, **settings},
    )
    executor = get_node_registry().get(node.type, node.version).executor
    schema = executor.infer_schema(node, {"input": data.schema}, CONTEXT)
    result = executor.execute(node, {"input": data}, CONTEXT)
    assert result.schema == schema
    return result


@pytest.mark.parametrize(
    ("expression", "expected"),
    [
        ("0.1 + 0.2", "0.30"),
        ("9007199254740993.11 + 0.01", "9007199254740993.12"),
        ("(1 / 3) * 3", "1.00"),
        ("1.005", "1.00"),
        ("1.015", "1.02"),
        ("-1.005", "-1.00"),
        ("-1.015", "-1.02"),
        ("1005 / 1000", "1.00"),
        ("1015 / 1000", "1.02"),
        ("0.10000000000000000000000000000000000001 * 10", "1.00"),
        ("abs(-3) + minimum(3, 2) - maximum(-3, -2)", "7.00"),
        ("coalesce(None, nullif(2, 2), 0.1)", "0.10"),
        ("safe_divide(1 / 0, 0, 0.1)", "0.10"),
        ("safe_divide(1, 2, 1 / 0)", "0.50"),
        ("coalesce(1, 1 / 0)", "1.00"),
        ("+1_000.01e-2", "10.00"),
    ],
)
def test_exact_literals_and_single_final_half_even_rounding(expression: str, expected: str) -> None:
    with localcontext() as context:
        context.prec = 2  # The host Decimal context must never alter formula arithmetic.
        result = run(expression)
    assert result.frame["result"].to_list() == [Decimal(expected)] * DATA.row_count
    assert result.schema.columns[-1].metadata == {
        "source_columns": [],
        "precision": 38,
        "scale": 2,
        "rounding": "half_even",
    }
    assert result.metadata["exact_transport"] is True


def test_fields_nulls_identity_and_big_integers() -> None:
    result = run("[amount_id] + [quantity_id] / 3")
    assert result.frame["result"].to_list() == [
        Decimal("9007199254740994.11"),
        Decimal("0.01"),
        None,
    ]
    assert result.schema.columns[-1].metadata["source_columns"] == ["amount_id", "quantity_id"]
    renamed = Dataset(
        DATA.frame.rename({"amount": "renamed"}),
        DatasetSchema(
            (
                replace(SCHEMA.columns[0], engine_name="renamed", display_name="Renamed"),
                *SCHEMA.columns[1:],
            )
        ),
    )
    assert (
        run("[amount_id] + [quantity_id] / 3", renamed).frame["result"].to_list()
        == result.frame["result"].to_list()
    )
    big = Dataset(
        pl.DataFrame({"quantity": [9007199254740993]}), DatasetSchema((SCHEMA.columns[1],))
    )
    assert run("quantity + 0.01", big).frame["result"][0] == Decimal("9007199254740993.01")


def test_null_handling_and_guarded_division() -> None:
    assert run("safe_divide(amount, quantity, 0)").frame["result"].to_list() == [
        Decimal("3002399751580331.04"),
        Decimal("0.00"),
        Decimal("0.00"),
    ]
    assert run("amount / nullif(quantity, 0)").frame["result"].to_list() == [
        Decimal("3002399751580331.04"),
        None,
        None,
    ]
    for expression in ("minimum(None, 2)", "maximum(1, None)", "None + 1"):
        assert run(expression).frame["result"].null_count() == 3
    assert run("nullif(1, None)").frame["result"].to_list() == [Decimal("1.00")] * 3


@pytest.mark.parametrize(
    "expression",
    [
        "1 / 0",
        "amount / quantity",
        "999.995",
        "9999 + 1",
    ],
)
def test_division_by_zero_and_output_overflow_are_explicit(expression: str) -> None:
    with pytest.raises(NodeExecutionError):
        run(expression, precision=5, scale=2)


def test_invalid_late_row_is_not_hidden_by_preview_limit() -> None:
    data = Dataset(pl.DataFrame({"quantity": [1] * 100 + [0]}), DatasetSchema((SCHEMA.columns[1],)))
    with pytest.raises(NodeExecutionError, match="division by zero"):
        run("1 / quantity", data)


@pytest.mark.parametrize(
    "expression",
    [
        "__import__('os').system('whoami')",
        "amount.__class__",
        "open('file')",
        "[x for x in amount]",
        "lambda: 1",
        "True",
        "'1.00'",
        "2 ** 999",
        "amount // 2",
        "amount % 2",
        "amount > 1",
        "unknown + 1",
        "approximate + 1",
        "[missing]",
        "1e999",
        "1e-999",
        "(1, 2)",
        "__nodebi_0",
        "amount[0]",
        "0xff",
        "round(1, 2)",
        "safe_divide(1, 0)",
        "abs(value=1)",
        "9" * 39,
        "1 + " * 130 + "1",
        "-" * 65 + "1",
    ],
)
def test_unsafe_inexact_or_unbounded_syntax_is_rejected(expression: str) -> None:
    with pytest.raises(FormulaValidationError):
        compile_exact_formula(expression, SCHEMA)


@pytest.mark.parametrize(
    "settings",
    [
        {"precision": 0},
        {"precision": 39},
        {"scale": -1},
        {"scale": 39},
        {"precision": 2, "scale": 3},
        {"precision": True},
        {"scale": "2"},
        {"rounding": "half_up"},
        {"unknown": 3},
    ],
)
def test_explicit_output_contract_validation(settings: dict) -> None:
    with pytest.raises(ValueError):
        run("1", **settings)


def test_intermediate_resource_bound_and_full_precision() -> None:
    with pytest.raises(NodeExecutionError, match="intermediate is too large"):
        run(" * ".join(["1e37"] * 5))
    assert run("9" * 38, scale=0).frame["result"][0] == Decimal("9" * 38)
    assert run("1e-38", scale=38).frame["result"][0] == Decimal("1e-38")
    for expression in ("1", "[amount_id] + 1"):
        result = run(expression, Dataset(DATA.frame.head(0), SCHEMA))
        assert result.row_count == 0
        assert result.frame.schema["result"] == pl.Decimal(38, 2)


def test_money_formulas_match_independent_decimal_oracle() -> None:
    # Independent high precision Decimal arithmetic across signs and division scales.
    for cents in range(-200, 201, 7):
        for denominator in (3, 7, 16, 200):
            with localcontext() as context:
                context.prec = 80
                expected = ((Decimal(cents) / 100 + Decimal("0.015")) / denominator).quantize(
                    Decimal("0.01")
                )
            assert run(f"({cents} / 100 + 0.015) / {denominator}").frame["result"][0] == expected


def test_version_one_stays_float_and_rejects_decimal_arithmetic() -> None:
    node = NodeInstance(
        uuid4(),
        "calculated_column",
        1,
        Position(0, 0),
        {"name": "result", "expression": "0.1 + 0.2"},
    )
    executor = get_node_registry().get(node.type, 1).executor
    result = executor.execute(node, {"input": DATA}, CONTEXT)
    assert result.frame["result"][0] == 0.1 + 0.2
    assert result.schema.columns[-1].logical_type == LogicalType.FLOAT
    with pytest.raises(FormulaValidationError):
        executor.infer_schema(
            replace(node, config={"name": "result", "expression": "amount + 1"}),
            {"input": SCHEMA},
            CONTEXT,
        )


def test_exact_graph_publication_report_editing_release_and_restore(
    db_engine: Engine, tmp_path: Path
) -> None:
    client, project, ids, original = example(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    aggregate = next(n for n in graph["nodes"] if n["type"] == "group_by")
    calculation_id = uuid4()
    calculation = {
        "id": str(calculation_id),
        "type": "calculated_column",
        "version": 2,
        "position": {"x": 250, "y": 0},
        "ui": {},
        "config": {
            "name": "Exact",
            "expression": f"[{original['measures'][0]['column_id']}] + 9007199254740993.01",
            "precision": 38,
            "scale": 2,
        },
    }
    graph["nodes"].append(calculation)
    graph["edges"][0]["source_node_id"] = str(calculation_id)
    graph["edges"].append(
        {
            "id": str(uuid4()),
            "source_node_id": source["id"],
            "source_port": "dataset",
            "target_node_id": str(calculation_id),
            "target_port": "input",
        }
    )
    aggregate["config"]["aggregations"][0]["column_id"] = f"calc_{calculation_id.hex}"
    saved = save_workflow(client, graph)
    reloaded = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert reloaded["nodes"] == saved["nodes"]
    rendered = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert rendered.status_code == 200, rendered.text
    expected = [
        {original["dimensions"][0]: "A", "Revenue": "18014398509481986.32"},
        {original["dimensions"][0]: "B", "Revenue": "9007199254740993.51"},
    ]
    assert rendered.json()["rows"] == expected
    edit_endpoint = f"/api/v1/projects/{project}/report-builder/{ids['visualization_id']}"
    projected = client.get(edit_endpoint)
    assert projected.status_code == 200, projected.text
    assert any(
        step["node_id"] == str(calculation_id) and not step["editable"]
        for step in projected.json()["steps"]
    )
    client.post(f"/api/v1/projects/{project}/checks")
    checked = client.get(f"/api/v1/projects/{project}/report-jobs").json()[0]
    assert checked["status"] == "succeeded", checked
    released = client.post(
        f"/api/v1/projects/{project}/releases",
        json={
            "name": "Exact",
            "period": "October",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": checked["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"/api/v1/projects/{project}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored exact formula"}
    )
    assert restored.status_code == 200, restored.text
    restored_visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()[
        "items"
    ][0]
    result = client.post(f"/api/v1/visualizations/{restored_visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"] == expected
