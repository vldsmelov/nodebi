from dataclasses import replace
from datetime import date
from decimal import Decimal, localcontext

import polars as pl
import pytest
from test_exact_field_operations import exact_graph
from test_typed_execution import edge, node, setup

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.nodes import get_node_registry
from app.services.execution import ExecutionFailure, WorkflowExecutionService
from app.services.workflow_validation import WorkflowSchemaResolver


@pytest.mark.parametrize(
    "expression,expected",
    [
        ("a / 3 * 3 + b", ["9007199254740993.13", "0.14", None]),
        ("if_else(is_null(a), b, a)", ["9007199254740993.12", "0.13", "0.01"]),
        ("safe_divide(a, 0, b)", ["0.01", "0.01", "0.01"]),
        ("if_else(a > 1, a, coalesce(a, 0) + b)", ["9007199254740993.12", "0.14", "0.01"]),
        ("1 / 3 * 3", ["1.00", "1.00", "1.00"]),
    ],
)
def test_exact_field_and_scalar_bindings(expression, expected):
    graph, context, access = exact_graph()
    source = graph.nodes[0]
    constant = replace(node("scalar_constant", value="0.01"), version=2)
    calc = replace(node("field_formula", expression=expression), version=2)
    graph = replace(
        graph,
        nodes=(source, constant, calc),
        edges=(
            edge(source, calc, "a", "p"),
            edge(constant, calc, "b", output="value"),
        ),
    )
    inferred = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert inferred.valid, inferred.issues
    assert access.loads == 0
    with localcontext() as ambient:
        ambient.prec = 4
        result = WorkflowExecutionService(get_node_registry()).execute(graph, calc.id, context)
    assert result.output.frame.to_series().to_list() == [
        Decimal(v) if v else None for v in expected
    ]
    assert result.output.metadata["exact_transport"]
    assert result.schema.columns[0].metadata["scale"] == 2


@pytest.mark.parametrize(
    "expression,expected",
    [
        ("1 / 3 * 3", "1.00"),
        ("2.345", "2.34"),
        ("2.355", "2.36"),
        ("if_else(True, 0.1 + 0.2, 1 / 0)", "0.30"),
        ("coalesce(None, 0)", "0.00"),
    ],
)
def test_scalar_only_formula_and_lazy_branches(expression, expected):
    graph, context, _ = setup()
    calc = replace(node("field_formula", expression=expression), version=2)
    graph = replace(graph, nodes=(calc,), edges=())
    result = WorkflowExecutionService(get_node_registry()).execute(graph, calc.id, context)
    assert result.output.frame.item() == Decimal(expected)


@pytest.mark.parametrize("values", [[], [None], [Decimal("1.00")]])
def test_constant_expression_retains_connected_population(values):
    graph, context, _ = exact_graph(values)
    source = graph.nodes[0]
    first = replace(node("field_formula", expression="1"), version=2)
    second = replace(node("field_formula", expression="a + 1"), version=2)
    graph = replace(
        graph,
        nodes=(source, first, second),
        edges=(
            edge(source, first, "c", "p"),
            edge(first, second, "a", output="value"),
        ),
    )
    result = WorkflowExecutionService(get_node_registry()).execute(graph, second.id, context)
    assert result.output.frame.to_series().to_list() == [Decimal("2.00")] * len(values)


@pytest.mark.parametrize(
    "kind,values,expression",
    [
        (LogicalType.STRING, ["yes", "no", None], 'if_else(a == "yes", b, c)'),
        (LogicalType.BOOLEAN, [True, False, None], "if_else(a, b, c)"),
        (LogicalType.DATE, [date(2026, 1, 1), date(2026, 1, 2), None], "if_else(a == a, b, c)"),
    ],
)
def test_nonnumeric_conditions_with_three_connected_inputs(kind, values, expression):
    graph, context, access = exact_graph()
    access.dataset = Dataset(
        pl.DataFrame({"condition": values}),
        DatasetSchema((ColumnSchema("condition", "condition", "Condition", kind, True),)),
    )
    source = graph.nodes[0]
    left = replace(node("scalar_constant", value="1.11"), version=2)
    right = replace(node("scalar_constant", value="2.22"), version=2)
    calc = replace(node("field_formula", expression=expression), version=2)
    graph = replace(
        graph,
        nodes=(source, left, right, calc),
        edges=(
            edge(source, calc, "a", "condition"),
            edge(left, calc, "b", output="value"),
            edge(right, calc, "c", output="value"),
        ),
    )
    result = WorkflowExecutionService(get_node_registry()).execute(graph, calc.id, context)
    expected = ["1.11", "1.11" if kind == LogicalType.DATE else "2.22", "2.22"]
    assert result.output.frame.to_series().to_list() == list(map(Decimal, expected))


@pytest.mark.parametrize("expression", ["d + 1", "__import__('os')", "a.__class__", "a ** 2"])
def test_invalid_formula_fails_preflight_before_loading(expression):
    graph, context, access = exact_graph()
    source = graph.nodes[0]
    calc = replace(node("field_formula", expression=expression), version=2)
    graph = replace(graph, nodes=(source, calc), edges=(edge(source, calc, "a", "p"),))
    result = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert not result.valid
    assert access.loads == 0
    assert any(issue.field == "config.expression" for issue in result.issues)


@pytest.mark.parametrize("expression", ["1 / 0", "99999999999999999999999999999999999999 + 1"])
def test_division_and_overflow_fail_explicitly(expression):
    graph, context, _ = exact_graph()
    calc = replace(node("field_formula", expression=expression, scale=0), version=2)
    graph = replace(graph, nodes=(calc,), edges=())
    with pytest.raises(ExecutionFailure):
        WorkflowExecutionService(get_node_registry()).execute(graph, calc.id, context)


def test_float_rejected_and_foreign_row_contexts_never_zip():
    graph, context, access = setup()
    source = graph.nodes[0]
    float_value = node("scalar_constant", value=0.1)
    calc = replace(node("field_formula", expression="a + b"), version=2)
    graph = replace(
        graph,
        nodes=(source, float_value, calc),
        edges=(
            edge(source, calc, "a", "p"),
            edge(float_value, calc, "b", output="value"),
        ),
    )
    resolver = WorkflowSchemaResolver(get_node_registry())
    assert not resolver.resolve(graph, context).valid
    other = node("excel_source", **source.config)
    graph = replace(
        graph,
        nodes=(source, other, calc),
        edges=(
            edge(source, calc, "a", "p"),
            edge(other, calc, "b", "p"),
        ),
    )
    assert not resolver.resolve(graph, context).valid
    assert access.loads == 0
