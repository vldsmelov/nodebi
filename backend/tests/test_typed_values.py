from dataclasses import replace
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.formulas import FormulaValidationError, compile_formula
from app.domain.parameters import ParameterDefinition
from app.domain.values import (
    FieldValue,
    RowContext,
    ScalarValue,
    TableValue,
    ValueConnectionError,
    append_field,
    arithmetic,
    compare,
    dataset_outputs,
    filter_rows,
    logical,
    parameter_scalar,
    project_field,
    project_schema,
    sum_field,
)


def table() -> TableValue:
    return TableValue(
        RowContext(uuid4(), uuid4(), "dataset"),
        Dataset(
            pl.DataFrame({"quantity": [2, 3, None], "price": [10, 20, 30]}),
            DatasetSchema(
                tuple(
                    ColumnSchema(identifier, name, "Duplicate label", LogicalType.INTEGER, True)
                    for identifier, name in (("q", "quantity"), ("p", "price"))
                )
            ),
            {"source": "test"},
        ),
    )


def test_revenue_expression_materializes_only_at_table_boundary() -> None:
    source = table()
    revenue = arithmetic("multiply", project_field(source, "q"), project_field(source, "p"))
    assert isinstance(revenue, FieldValue)
    assert revenue.formula.referenced_columns == ("q", "p")
    output = append_field(
        source,
        revenue,
        output_context=replace(source.context, node_id=uuid4()),
        column_id="r",
        name="Revenue",
    )
    assert output.dataset.frame["Revenue"].to_list() == [20, 60, None]
    assert source.dataset.frame.columns == ["quantity", "price"]
    assert output.dataset.metadata == source.dataset.metadata
    assert sum_field(output, project_field(output, "r")).value == 80
    # Once a table has been transformed, its old field wires cannot be reused downstream.
    with pytest.raises(ValueConnectionError, match="different table outputs"):
        arithmetic("add", revenue, project_field(output, "r"))


@pytest.mark.parametrize("changed", ["node_id", "workflow_id", "output_port"])
def test_equal_shapes_do_not_allow_positional_cross_branch_arithmetic(changed: str) -> None:
    source = table()
    other = replace(
        source,
        context=replace(
            source.context, **{changed: "other" if changed == "output_port" else uuid4()}
        ),
    )
    with pytest.raises(ValueConnectionError, match="Join"):
        arithmetic("add", project_field(source, "q"), project_field(other, "q"))


def test_scalar_broadcast_and_explicit_aggregate() -> None:
    source = table()
    field = arithmetic("multiply", project_field(source, "q"), ScalarValue(2))
    assert isinstance(field, FieldValue)
    assert sum_field(source, field).value == 10
    assert arithmetic("multiply", ScalarValue(3), ScalarValue(4)).value == 12  # type: ignore[union-attr]
    adapted = dataset_outputs(source.dataset, source.context)
    assert isinstance(adapted["dataset"], TableValue)
    assert adapted["dataset"].dataset is source.dataset


def test_renamed_column_uses_stable_id_and_removed_column_reports_connection() -> None:
    source = table()
    renamed = replace(
        source,
        dataset=Dataset(
            source.dataset.frame.rename({"quantity": "New name"}),
            DatasetSchema(
                (
                    replace(source.dataset.schema.columns[0], engine_name="New name"),
                    source.dataset.schema.columns[1],
                )
            ),
        ),
    )
    assert sum_field(renamed, project_field(renamed, "q")).value == 5
    with pytest.raises(ValueConnectionError, match="no longer exists"):
        project_field(renamed, "missing")


@pytest.mark.parametrize("numerator", [0, 2])
def test_division_policy_is_explicit_for_scalars_and_fields(numerator: int) -> None:
    with pytest.raises(ValueConnectionError, match="division by zero"):
        arithmetic("divide", ScalarValue(numerator), ScalarValue(0))
    assert arithmetic(
        "divide", ScalarValue(numerator), ScalarValue(0), zero_policy="null"
    ) == ScalarValue(None, LogicalType.FLOAT)
    source = table()
    result = arithmetic("divide", project_field(source, "q"), ScalarValue(0))
    with pytest.raises(ValueConnectionError, match="division by zero"):
        append_field(
            source,
            result,
            output_context=replace(source.context, node_id=uuid4()),
            column_id="r",
            name="r",
        )
    safe = arithmetic("divide", project_field(source, "q"), ScalarValue(0), zero_policy="null")
    output = append_field(
        source,
        safe,
        output_context=replace(source.context, node_id=uuid4()),
        column_id="r",
        name="r",
    )
    assert output.dataset.frame["r"].to_list() == [None, None, None]


@pytest.mark.parametrize("value", [True, "2"])
def test_no_implicit_numeric_conversion(value: bool | str) -> None:
    with pytest.raises(ValueConnectionError, match="numeric"):
        arithmetic("add", project_field(table(), "q"), ScalarValue(value))


def test_predicate_filter_null_policy_and_new_row_context() -> None:
    source = table()
    predicate = compare("greater", project_field(source, "q"), ScalarValue(2))
    assert isinstance(predicate, FieldValue)
    combined = logical("and", predicate, ScalarValue(True))
    assert isinstance(combined, FieldValue)
    context = replace(source.context, node_id=uuid4())
    for policy, expected in (("drop", [3]), ("keep", [3, None])):
        result = filter_rows(source, combined, output_context=context, null_policy=policy)  # type: ignore[arg-type]
        assert result.dataset.frame["quantity"].to_list() == expected
    with pytest.raises(ValueConnectionError, match="null values"):
        filter_rows(source, predicate, output_context=context, null_policy="error")
    with pytest.raises(ValueConnectionError, match="boolean"):
        filter_rows(source, project_field(source, "q"), output_context=context, null_policy="drop")


def test_empty_table_stays_empty_even_when_adding_scalar() -> None:
    source = table()
    source = replace(source, dataset=replace(source.dataset, frame=source.dataset.frame.head(0)))
    output = append_field(
        source,
        ScalarValue(42),
        output_context=replace(source.context, node_id=uuid4()),
        column_id="r",
        name="r",
    )
    assert output.dataset.row_count == 0
    assert sum_field(source, project_field(source, "q")) == ScalarValue(0.0)


def test_scalar_does_not_create_a_row_in_a_zero_column_table() -> None:
    context = RowContext(uuid4(), uuid4(), "table")
    source = TableValue(context, Dataset(pl.DataFrame(), DatasetSchema(())))
    result = append_field(
        source,
        ScalarValue(42),
        output_context=replace(context, node_id=uuid4()),
        column_id="r",
        name="r",
    )
    assert result.dataset.row_count == 0
    assert result.dataset.frame.columns == ["r"]


def test_expression_growth_is_bounded_before_materialization() -> None:
    value = project_field(table(), "q")
    with pytest.raises(ValueConnectionError, match="too complex"):
        for _ in range(20):
            result = arithmetic("add", value, value)
            assert isinstance(result, FieldValue)
            value = result


@pytest.mark.parametrize(
    "expression", ["__import__('os')", "a.__class__", "a[0]", "a is b", "a < b < a"]
)
def test_shared_compiler_remains_allowlisted(expression: str) -> None:
    with pytest.raises(FormulaValidationError):
        compile_formula(
            expression,
            DatasetSchema(()),
            bindings={"a": ScalarValue(1).formula, "b": ScalarValue(2).formula},
        )


def test_logical_operations_do_not_coerce_numbers() -> None:
    with pytest.raises(ValueConnectionError, match="boolean"):
        logical("not", ScalarValue(1))
    assert logical("not", ScalarValue(True)) == ScalarValue(False)
    assert logical("or", ScalarValue(False), ScalarValue(True)) == ScalarValue(True)


@pytest.mark.parametrize("value", [float("nan"), float("inf"), 2**63])
def test_invalid_constants_rejected(value: float | int) -> None:
    with pytest.raises(ValueConnectionError):
        ScalarValue(value)


def test_schema_preflight_does_not_need_a_dataframe() -> None:
    context = RowContext(uuid4(), uuid4(), "table")
    schema = DatasetSchema((ColumnSchema("q", "q", "q", LogicalType.INTEGER, False),))
    value = arithmetic("multiply", project_schema(context, schema, "q"), ScalarValue(2))
    assert isinstance(value, FieldValue)
    assert value.formula.logical_type == LogicalType.FLOAT
    assert value.context == context


def test_comparison_does_not_hide_division_error() -> None:
    source = table()
    quotient = arithmetic("divide", project_field(source, "q"), ScalarValue(0))
    predicate = compare("greater", quotient, ScalarValue(1))
    assert isinstance(predicate, FieldValue)
    with pytest.raises(ValueConnectionError, match="division by zero"):
        filter_rows(
            source,
            predicate,
            output_context=replace(source.context, node_id=uuid4()),
            null_policy="drop",
        )


def test_integer_comparison_does_not_round_distinct_ids() -> None:
    assert compare("equal", ScalarValue(2**53), ScalarValue(2**53 + 1)) == ScalarValue(False)


def test_parameter_scalar_uses_declared_type_default_and_current_view() -> None:
    definitions = (ParameterDefinition(name="factor", logical_type="float", default=2),)
    assert parameter_scalar("factor", definitions, {}).formula.logical_type == LogicalType.FLOAT
    assert parameter_scalar("factor", definitions, {}).value == 2
    assert parameter_scalar("factor", definitions, {"factor": 3}).value == 3
    assert (
        parameter_scalar("factor", definitions, {"factor": None}).formula.logical_type
        == LogicalType.FLOAT
    )
    with pytest.raises(ValueConnectionError, match="requires float"):
        parameter_scalar("factor", definitions, {"factor": "3"})
    with pytest.raises(ValueConnectionError, match="not declared"):
        parameter_scalar("missing", definitions, {})


def test_typed_null_and_date_scalars() -> None:
    predicate = logical("and", ScalarValue(None, LogicalType.BOOLEAN), ScalarValue(True))
    assert isinstance(predicate, ScalarValue)
    assert predicate.value is None
    assert predicate.formula.logical_type == LogicalType.BOOLEAN
    assert logical("not", predicate).formula.logical_type == LogicalType.BOOLEAN
    assert (
        compare(
            "less",
            ScalarValue("2026-01-01", LogicalType.DATE),
            ScalarValue("2026-02-01", LogicalType.DATE),
        ).value
        is True
    )  # type: ignore[union-attr]
    with pytest.raises(ValueConnectionError):
        ScalarValue("not a date", LogicalType.DATE)
