from dataclasses import replace
from decimal import Decimal, localcontext

import pytest
from test_exact_field_operations import exact_graph
from test_typed_execution import edge, node

from app.domain.parameters import ParameterDefinition, compatible_parameters, resolve_parameters
from app.nodes import get_node_registry
from app.nodes.field_operations import parameter_identity
from app.services.execution import WorkflowExecutionService
from app.services.workflow_validation import WorkflowSchemaResolver


def definition(**changes):
    return ParameterDefinition.model_validate(
        {"name": "amount", "logical_type": "decimal", "precision": 38, "scale": 8, **changes}
    )


@pytest.mark.parametrize(
    "value",
    [0.1, 1, True, "NaN", "Infinity", "1e2", " 1", "1,25", "1.000000001", "9" * 39, "0" * 81],
)
def test_decimal_parameters_reject_inexact_or_unbounded_values(value):
    with pytest.raises(ValueError):
        definition(default=value)


@pytest.mark.parametrize(
    "changes",
    [
        {"scale": None},
        {"precision": None},
        {"scale": 39},
        {"precision": 0},
        {"precision": 2},
        {"scale": True},
        {"logical_type": "float"},
    ],
)
def test_decimal_metadata_is_mandatory_and_only_for_decimal(changes):
    with pytest.raises(ValueError):
        definition(**changes)


def test_canonical_exact_values_are_context_independent_and_preserve_null_zero():
    with localcontext() as ambient:
        ambient.prec = 3
        item = definition(default="+09007199254740993.120000000")
        assert item.default == "9007199254740993.12000000"
        assert resolve_parameters((item,), {})["amount"] == item.default
        assert resolve_parameters((item,), {"amount": None}) == {"amount": None}
        assert item.checked("-0.000") == "0.00000000"
    assert "precision" not in ParameterDefinition(name="old", logical_type="float").model_dump()


def test_bindings_allow_only_lossless_decimal_ranges():
    source = definition(precision=12, scale=4)
    assert compatible_parameters(source, definition(precision=16, scale=6))
    assert not compatible_parameters(source, definition(precision=12, scale=6))
    assert not compatible_parameters(source, definition(precision=12, scale=2))
    assert not compatible_parameters(
        source, ParameterDefinition(name="float", logical_type="float")
    )


def test_parameter_field_formula_cache_and_precision_survive_multiple_values():
    graph, context, access = exact_graph()
    source = graph.nodes[0]
    parameter = node("scalar_parameter", name="amount")
    calc = replace(node("field_formula", expression="coalesce(a, 0) + b", scale=8), version=2)
    graph = replace(
        graph,
        nodes=(source, parameter, calc),
        edges=(
            edge(source, calc, "a", "p"),
            edge(parameter, calc, "b", output="value"),
        ),
    )
    context.parameter_definitions = (definition(default="0.00000001"),)
    resolver = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert resolver.valid, resolver.issues
    assert access.loads == 0
    runner = WorkflowExecutionService(get_node_registry())
    for value in ("0.00000001", "0.00000002", "0.00000001"):
        context.parameters = {"amount": value}
        result = runner.execute(graph, calc.id, context)
        assert result.output.frame.to_series().to_list()[-1] == Decimal(value)
        assert result.output.metadata["exact_transport"]
    assert access.loads == 1
    identity = parameter_identity(parameter, context)
    context.parameter_definitions = (definition(scale=9),)
    assert parameter_identity(parameter, context) != identity


def test_decimal_filter_parameter_and_context_selection_keep_large_digits():
    graph, context, _ = exact_graph()
    source = graph.nodes[0]
    context.parameter_definitions = (definition(scale=2),)
    context.parameters = {"amount": "9007199254740993.12"}
    filtered = node(
        "filter", conditions=[{"column_id": "p", "operator": "equals", "parameter": "amount"}]
    )
    graph = replace(graph, nodes=(source, filtered), edges=(edge(source, filtered, "input"),))
    runner = WorkflowExecutionService(get_node_registry())
    result = runner.execute(graph, filtered.id, context)
    assert result.output.frame["price"].to_list() == [Decimal("9007199254740993.12")]
    selected = node(
        "context_filter",
        column_id="p",
        role="amount",
        logical_type="decimal",
        value="9007199254740993.12",
    )
    graph = replace(graph, nodes=(source, selected), edges=(edge(source, selected, "input"),))
    assert runner.execute(graph, selected.id, context).output.frame["price"].to_list() == [
        Decimal("9007199254740993.12")
    ]
