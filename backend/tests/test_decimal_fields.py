from dataclasses import replace
from decimal import Decimal
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.formulas import FormulaValidationError, compile_formula
from app.domain.values import (
    RowContext,
    TableValue,
    ValueConnectionError,
    append_field,
    combine,
    project_field,
    single_value,
)
from app.nodes import get_node_registry
from app.services.execution import ExecutionFailure, WorkflowExecutionService
from app.services.workflow_validation import WorkflowSchemaResolver
from tests.test_exact_window import data
from tests.test_typed_execution import edge, node, setup


def decimal_table():
    original = data(["1.00000001", None, "1.10000000"], scale=8)
    return Dataset(
        original.frame.with_columns(
            pl.Series("other", [Decimal("1.1")] * 3, dtype=pl.Decimal(38, 1))
        ),
        DatasetSchema(
            (
                *original.schema.columns,
                ColumnSchema(
                    "b",
                    "other",
                    "Other",
                    LogicalType.DECIMAL,
                    False,
                    {"precision": 38, "scale": 1, "currency": "RUB"},
                ),
            )
        ),
        {"exact_transport": True},
    )


@pytest.mark.parametrize(
    "expression,expected,scale",
    [
        ("a", ["1.00000001", None, "1.10000000"], 8),
        ("coalesce(a, b)", ["1.00000001", "1.10000000", "1.10000000"], 8),
        ("if_else(is_null(a), b, a)", ["1.00000001", "1.10000000", "1.10000000"], 8),
        ("nullif(a, b)", ["1.00000001", None, None], 8),
        ("nullif(b, a)", ["1.1", "1.1", None], 1),
        ("coalesce(nullif(a, b), b)", ["1.00000001", "1.10000000", "1.10000000"], 8),
    ],
)
def test_decimal_field_preview_append_and_exact_sum_share_schema(expression, expected, scale):
    graph, context, access = setup()
    access.dataset = decimal_table()
    source = graph.nodes[0]
    formula, appended = (
        node("field_formula", expression=expression),
        node("append_field", name="Copy"),
    )
    total = replace(
        node(
            "group_by",
            dimensions=[],
            aggregations=[
                {"column_id": f"calc_{appended.id.hex}", "operation": "sum", "name": "Total"}
            ],
        ),
        version=2,
    )
    graph = replace(
        graph,
        nodes=(source, formula, appended, total),
        edges=(
            edge(source, formula, "a", "a"),
            edge(source, formula, "b", "b"),
            edge(source, appended, "table"),
            edge(formula, appended, "value", output="value"),
            edge(appended, total, "input"),
        ),
    )
    inferred = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert inferred.valid, inferred.issues
    assert access.loads == 0
    engine = WorkflowExecutionService(get_node_registry())
    preview = engine.execute(graph, formula.id, context).output
    values = [Decimal(v) if v is not None else None for v in expected]
    assert preview.frame["value"].to_list() == values
    assert preview.schema.columns[0].metadata["scale"] == scale
    result = engine.execute(graph, appended.id, context).output
    assert result.frame["Copy"].to_list() == values
    assert result.frame["Copy"].dtype == pl.Decimal(38, scale)
    assert result.schema.columns[-1].metadata["currency"] == "RUB"
    assert engine.execute(graph, total.id, context).output.frame.item() == sum(
        (v for v in values if v is not None), Decimal(0)
    )


@pytest.mark.parametrize("scale", [0, 8, 18, 38])
def test_direct_projection_preserves_metadata_and_digits(scale):
    text = "1" if scale == 0 else "0." + "0" * (scale - 1) + "1"
    source = TableValue(RowContext(uuid4(), uuid4(), "dataset"), data([text], scale=scale))
    result = append_field(
        source,
        project_field(source, "a"),
        output_context=replace(source.context, node_id=uuid4()),
        column_id="copy",
        name="Copy",
    ).dataset
    assert result.schema.by_id("copy").metadata == {
        **source.dataset.schema.by_id("a").metadata,
        "source_columns": ["a"],
    }
    assert result.frame["Copy"][0] == Decimal(text)


@pytest.mark.parametrize(
    "expression", ["coalesce([a], [b])", "nullif([a], [b])", "if_else(True, [a], [b])", "[a] < [b]"]
)
def test_incompatible_decimal_currencies_fail_before_loading(expression):
    source = decimal_table()
    bad = replace(source.schema.columns[-1], metadata={"scale": 1, "currency": "USD"})
    schema = DatasetSchema((*source.schema.columns[:-1], bad))
    with pytest.raises(FormulaValidationError, match="currencies"):
        compile_formula(expression, schema, allow_predicates=True)


def test_decimal_comparison_uses_exact_scale_and_conditional_result_ignores_predicate_scale():
    source = decimal_table()
    formula = compile_formula("[a] < [b]", source.schema, allow_predicates=True)
    assert source.frame.select(formula.expression).to_series().to_list() == [True, None, False]
    formula = compile_formula(
        "if_else(is_null([a]), [b], [b])", source.schema, allow_predicates=True
    )
    assert formula.metadata["scale"] == 1


def test_decimal_overflow_and_malformed_physical_schema_fail_explicitly():
    source = TableValue(RowContext(uuid4(), uuid4(), "dataset"), decimal_table())
    malformed = replace(
        source,
        dataset=replace(
            source.dataset,
            frame=source.dataset.frame.with_columns(pl.col("amount").cast(pl.Decimal(38, 2))),
        ),
    )
    with pytest.raises(ValueConnectionError, match="declared scale"):
        append_field(
            malformed,
            project_field(malformed, "a"),
            output_context=replace(source.context, node_id=uuid4()),
            column_id="copy",
            name="Copy",
        )
    huge = replace(
        source,
        dataset=replace(
            source.dataset,
            frame=source.dataset.frame.with_columns(
                pl.Series("other", [Decimal("9" * 37 + ".1")] * 3, dtype=pl.Decimal(38, 1))
            ),
        ),
    )
    formula = combine(
        "coalesce(a, b)", {"a": project_field(huge, "a"), "b": project_field(huge, "b")}
    )
    with pytest.raises(ValueConnectionError, match="precision and scale"):
        append_field(
            huge,
            formula,
            output_context=replace(source.context, node_id=uuid4()),
            column_id="copy",
            name="Copy",
        )


def test_decimal_scalar_boundary_fails_in_preflight_without_loading():
    graph, context, access = setup()
    access.dataset = decimal_table()
    source, scalar = graph.nodes[0], node("field_scalar")
    graph = replace(
        graph,
        nodes=(source, scalar),
        edges=(
            edge(source, scalar, "table"),
            edge(source, scalar, "value", "a"),
        ),
    )
    with pytest.raises(ExecutionFailure) as failure:
        WorkflowExecutionService(get_node_registry()).execute(graph, scalar.id, context)
    assert "Decimal scalar outputs" in failure.value.issues[0].message
    assert access.loads == 0
    table = TableValue(RowContext(graph.id, source.id, "dataset"), access.dataset)
    with pytest.raises(ValueConnectionError, match="Decimal scalar outputs"):
        single_value(table, project_field(table, "a"))


@pytest.mark.parametrize("empty", [False, True])
def test_nullable_decimal_branches_preserve_schema_for_empty_and_null_inputs(empty):
    source = data([] if empty else [None], scale=18)
    compiled = compile_formula("coalesce([a], None)", source.schema, allow_predicates=True)
    result = source.frame.select(compiled.expression)
    assert result.height == source.row_count
    assert result.to_series().to_list() == ([] if empty else [None])
    assert result.dtypes == [pl.Decimal(38, 18)]
    assert compiled.metadata["scale"] == 18


def test_legacy_calculated_column_pass_through_retains_decimal_contract():
    source = decimal_table()
    _, context, _ = setup()
    calculated = node("calculated_column", name="Copy", expression="coalesce([a], [b])")
    executor = get_node_registry().get("calculated_column", 1).executor
    inferred = executor.infer_schema(calculated, {"input": source.schema}, context)
    result = executor.execute(calculated, {"input": source}, context)
    assert result.schema == inferred
    assert result.schema.columns[-1].metadata["scale"] == 8
    assert result.frame["Copy"].to_list() == [Decimal("1.00000001"), Decimal("1.1"), Decimal("1.1")]
