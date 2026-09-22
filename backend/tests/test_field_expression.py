from dataclasses import replace

import pytest
from test_typed_execution import edge, node, setup

from app.domain.datasets import Dataset
from app.nodes import get_node_registry
from app.services.execution import ExecutionFailure, WorkflowExecutionService
from app.services.workflow_validation import WorkflowSchemaResolver


@pytest.mark.parametrize(
    "expression,expected",
    [("safe_divide(b, a, 0)", [5, 20 / 3, 0]), ("coalesce(a, 0) + b", [12, 23, 30])],
)
def test_expression_uses_shared_formula_and_field_context(expression, expected):
    graph, context, access = setup()
    source = graph.nodes[0]
    formula = node("field_formula", expression=expression)
    graph = replace(
        graph,
        nodes=(source, formula),
        edges=(
            edge(source, formula, "a", "q"),
            edge(source, formula, "b", "p"),
        ),
    )
    schema = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert schema.valid, schema.issues
    assert access.loads == 0
    result = WorkflowExecutionService(get_node_registry()).execute(graph, formula.id, context)
    assert result.output.frame["value"].to_list() == pytest.approx(expected)


@pytest.mark.parametrize("expression", ["missing + 1", "__import__('os')", "a.some_method()"])
def test_invalid_expression_fails_before_reading(expression):
    graph, context, access = setup()
    formula = node("field_formula", expression=expression)
    graph = replace(graph, nodes=(formula,), edges=())
    result = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert not result.valid
    assert result.issues[0].field == "config.expression"
    assert access.loads == 0


@pytest.mark.parametrize("rows", [0, 1, 2])
def test_single_value_requires_exactly_one_row_and_preserves_type(rows):
    graph, context, access = setup()
    source = graph.nodes[0]
    single = node("field_scalar")
    graph = replace(
        graph,
        nodes=(source, single),
        edges=(
            edge(source, single, "table"),
            edge(source, single, "value", "q"),
        ),
    )
    access.dataset = Dataset(access.dataset.frame.head(rows), access.dataset.schema)
    runner = WorkflowExecutionService(get_node_registry())
    if rows == 1:
        result = runner.execute(graph, single.id, context)
        assert result.value_kind == "scalar"
        assert result.output.frame.item() == 2
    else:
        with pytest.raises(ExecutionFailure, match="exactly one row"):
            runner.execute(graph, single.id, context)


def test_single_value_text_null_and_kpi_navigation_context():
    graph, context, access = setup()
    source = graph.nodes[0]
    expression = node("field_formula", expression='nullif(trim(a), "")')
    text = node("scalar_constant", value=" Leader ")
    single = node("field_scalar")
    kpi = replace(node("kpi", context_column_ids=["q"]), version=2)
    graph = replace(
        graph,
        nodes=(source, expression, text, single, kpi),
        edges=(
            edge(text, expression, "a", output="value"),
            edge(source, single, "table"),
            edge(source, single, "value", "q"),
            edge(expression, kpi, "value", output="value"),
            edge(source, kpi, "table"),
        ),
    )
    access.dataset = Dataset(access.dataset.frame.tail(1), access.dataset.schema)
    runner = WorkflowExecutionService(get_node_registry())
    assert runner.execute(graph, single.id, context).output.frame.item() is None
    result = runner.execute(graph, kpi.id, context)
    assert result.output.frame["value"].to_list() == ["Leader"]
    assert result.output.frame["quantity"].to_list() == [None]
    access.dataset = Dataset(access.dataset.frame.head(0), access.dataset.schema)
    context.cache.clear()
    with pytest.raises(ExecutionFailure, match="exactly one row"):
        runner.execute(graph, kpi.id, context)


def test_expression_foreign_third_input_is_attributed_before_loading():
    graph, context, access = setup()
    source = graph.nodes[0]
    other = replace(source, id=node("excel_source").id)
    formula = node("field_formula", expression="a + c")
    graph = replace(
        graph,
        nodes=(source, other, formula),
        edges=(
            edge(source, formula, "a", "q"),
            edge(other, formula, "c", "p"),
        ),
    )
    schema = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert not schema.valid
    assert schema.issues[0].field == "c"
    assert schema.issues[0].edge_id == graph.edges[1].id
    assert access.loads == 0


def test_expression_cannot_mask_nonfinite_intermediate_with_a_comparison():
    graph, context, _ = setup()
    source = graph.nodes[0]
    formula = node("field_formula", expression="a / 0")
    predicate = node("field_formula", expression="a > 0")
    graph = replace(
        graph,
        nodes=(source, formula, predicate),
        edges=(
            edge(source, formula, "a", "q"),
            edge(formula, predicate, "a", output="value"),
        ),
    )
    with pytest.raises(ExecutionFailure, match="non-finite"):
        WorkflowExecutionService(get_node_registry()).execute(graph, predicate.id, context)
