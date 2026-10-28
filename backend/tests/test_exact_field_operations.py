from dataclasses import replace
from decimal import Decimal, localcontext

import polars as pl
import pytest
from test_typed_execution import edge, node, setup

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.values import ScalarValue, ValueConnectionError
from app.nodes import get_node_registry
from app.services.execution import ExecutionFailure, WorkflowExecutionService
from app.services.workflow_validation import WorkflowSchemaResolver


def exact_graph(values=None):
    graph, context, source = setup()
    values = (
        values if values is not None else [Decimal("9007199254740993.12"), Decimal("0.13"), None]
    )
    source.dataset = Dataset(
        pl.DataFrame(
            {"quantity": [2] * len(values), "price": pl.Series(values, dtype=pl.Decimal(38, 2))}
        ),
        DatasetSchema(
            (
                ColumnSchema("q", "quantity", "Quantity", LogicalType.INTEGER, False),
                ColumnSchema(
                    "p",
                    "price",
                    "Price",
                    LogicalType.DECIMAL,
                    True,
                    {"precision": 38, "scale": 2, "currency": "RUB"},
                ),
            )
        ),
    )
    graph = replace(
        graph,
        nodes=tuple(
            replace(n, version=2) if n.type in {"field_arithmetic", "field_sum"} else n
            for n in graph.nodes
        ),
    )
    return graph, context, source


def test_full_field_append_sum_scalar_kpi_is_exact_with_small_ambient_context():
    graph, context, source = exact_graph()
    total = graph.nodes[-1]
    kpi = replace(node("kpi"), version=2)
    graph = replace(
        graph,
        nodes=(*graph.nodes, kpi),
        edges=(*graph.edges, edge(total, kpi, "value", output="value")),
    )
    inferred = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert inferred.valid, inferred.issues
    assert source.loads == 0
    with localcontext() as decimal_context:
        decimal_context.prec = 5
        result = WorkflowExecutionService(get_node_registry()).execute(graph, kpi.id, context)
    assert result.output.frame.item() == Decimal("18014398509481986.50")
    assert result.schema.columns[0].metadata["scale"] == 2
    assert result.output.metadata["exact_transport"] is True


@pytest.mark.parametrize(
    "values,expected", [([], "0.00"), ([None, None], "0.00"), ([Decimal("-0.05")], "-0.10")]
)
def test_empty_null_and_negative_totals(values, expected):
    graph, context, _ = exact_graph(values)
    result = WorkflowExecutionService(get_node_registry()).execute(
        graph, graph.nodes[-1].id, context
    )
    assert result.output.frame.item() == Decimal(expected)
    assert result.output.metadata["exact_transport"]


@pytest.mark.parametrize(
    "operation,a,b,scale,expected",
    [
        ("add", "0.1", "0.2", 2, "0.30"),
        ("subtract", "0.1", "0.2", 2, "-0.10"),
        ("multiply", "2.25", "1", 1, "2.2"),
        ("multiply", "2.35", "1", 1, "2.4"),
        ("divide", "1", "3", 8, "0.33333333"),
        ("divide", "9007199254740993.12", "2", 2, "4503599627370496.56"),
    ],
)
def test_scalar_arithmetic_matches_independent_expected_values(operation, a, b, scale, expected):
    graph, context, _ = setup()
    left, right = (replace(node("scalar_constant", value=value), version=2) for value in (a, b))
    calc = replace(node("field_arithmetic", operation=operation, scale=scale), version=2)
    graph = replace(
        graph,
        nodes=(left, right, calc),
        edges=(edge(left, calc, "a", output="value"), edge(right, calc, "b", output="value")),
    )
    result = WorkflowExecutionService(get_node_registry()).execute(graph, calc.id, context)
    assert result.output.frame.item() == Decimal(expected)
    assert result.schema.columns[0].metadata["scale"] == scale


@pytest.mark.parametrize("policy", ["error", "null"])
def test_field_division_zero_and_scalar_broadcast(policy):
    graph, context, _ = exact_graph([Decimal("0.00"), Decimal("0.25")])
    source = graph.nodes[0]
    constant = replace(node("scalar_constant", value="1.00"), version=2)
    calc = replace(node("field_arithmetic", operation="divide", zero_policy=policy), version=2)
    graph = replace(
        graph,
        nodes=(source, constant, calc),
        edges=(edge(constant, calc, "a", output="value"), edge(source, calc, "b", "p")),
    )
    runner = WorkflowExecutionService(get_node_registry())
    if policy == "error":
        with pytest.raises(ExecutionFailure):
            runner.execute(graph, calc.id, context)
    else:
        result = runner.execute(graph, calc.id, context)
        assert result.output.frame.to_series().to_list() == [None, Decimal("4.00")]


@pytest.mark.parametrize("values", [[], [Decimal("1.00"), Decimal("2.00")]])
def test_single_value_rejects_wrong_cardinality(values):
    graph, context, _ = exact_graph(values)
    source = graph.nodes[0]
    single = replace(node("field_scalar"), version=2)
    graph = replace(
        graph,
        nodes=(source, single),
        edges=(edge(source, single, "table"), edge(source, single, "value", "p")),
    )
    with pytest.raises(ExecutionFailure, match="exactly one row"):
        WorkflowExecutionService(get_node_registry()).execute(graph, single.id, context)


@pytest.mark.parametrize("value", [Decimal("1.25"), None])
def test_single_value_retains_scale_currency_and_null(value):
    graph, context, _ = exact_graph([value])
    source = graph.nodes[0]
    single = replace(node("field_scalar"), version=2)
    graph = replace(
        graph,
        nodes=(source, single),
        edges=(edge(source, single, "table"), edge(source, single, "value", "p")),
    )
    result = WorkflowExecutionService(get_node_registry()).execute(graph, single.id, context)
    assert result.output.frame.item() == value
    assert result.schema.columns[0].metadata["currency"] == "RUB"
    assert result.schema.columns[0].metadata["scale"] == 2


def test_float_input_rejected_in_preflight_and_legacy_decimal_still_rejected():
    graph, context, source = exact_graph()
    graph = replace(
        graph,
        nodes=tuple(
            replace(n, version=1) if n.type == "field_arithmetic" else n for n in graph.nodes
        ),
    )
    assert not WorkflowSchemaResolver(get_node_registry()).resolve(graph, context).valid
    assert source.loads == 0
    graph, context, source = setup()
    source.dataset = Dataset(
        source.dataset.frame.with_columns(pl.col("price").cast(pl.Float64)),
        DatasetSchema(
            (
                source.dataset.schema.columns[0],
                replace(source.dataset.schema.columns[1], logical_type=LogicalType.FLOAT),
            )
        ),
    )
    graph = replace(
        graph,
        nodes=tuple(
            replace(n, version=2) if n.type == "field_arithmetic" else n for n in graph.nodes
        ),
    )
    inferred = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert not inferred.valid and any("Float64" in issue.message for issue in inferred.issues)
    assert source.loads == 0


def test_decimal_scalar_rejects_lossy_values_and_sum_overflow():
    with pytest.raises(ValueConnectionError, match="scale"):
        ScalarValue(Decimal("0.001"), LogicalType.DECIMAL, {"precision": 38, "scale": 2})
    graph, context, _ = exact_graph([Decimal("9" * 36 + ".00")])
    with pytest.raises(ExecutionFailure):
        WorkflowExecutionService(get_node_registry()).execute(graph, graph.nodes[-1].id, context)


def test_sum_overflow_is_rejected_without_wrapping_decimal128():
    graph, context, _ = exact_graph([Decimal("9" * 36 + ".00")] * 2)
    source = graph.nodes[0]
    total = replace(node("field_sum"), version=2)
    graph = replace(
        graph,
        nodes=(source, total),
        edges=(edge(source, total, "table"), edge(source, total, "value", "p")),
    )
    with pytest.raises(ExecutionFailure, match="precision"):
        WorkflowExecutionService(get_node_registry()).execute(graph, total.id, context)


def test_integer_sum_can_exceed_int64_without_float_conversion():
    graph, context, source = setup()
    source.dataset = Dataset(
        pl.DataFrame({"quantity": [2**63 - 1, 2**63 - 1], "price": [1, 1]}), source.dataset.schema
    )
    origin = graph.nodes[0]
    total = replace(node("field_sum"), version=2)
    graph = replace(
        graph,
        nodes=(origin, total),
        edges=(edge(origin, total, "table"), edge(origin, total, "value", "q")),
    )
    result = WorkflowExecutionService(get_node_registry()).execute(graph, total.id, context)
    assert result.output.frame.item() == Decimal("18446744073709551614")
    assert result.schema.columns[0].metadata["scale"] == 0


def test_exact_fields_cannot_cross_unjoined_row_contexts():
    graph, context, source = exact_graph()
    origin, arithmetic = graph.nodes[:2]
    foreign = replace(origin, id=node("excel_source").id)
    graph = replace(
        graph,
        nodes=(origin, foreign, arithmetic),
        edges=(edge(origin, arithmetic, "a", "p"), edge(foreign, arithmetic, "b", "p")),
    )
    result = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert not result.valid and any(
        "different table outputs" in issue.message for issue in result.issues
    )
    assert source.loads == 0
