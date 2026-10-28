from dataclasses import replace
from datetime import UTC, date, datetime
from decimal import Decimal, localcontext
from itertools import product

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema
from app.domain.datasets import LogicalType as T
from app.domain.errors import NodeExecutionError
from app.domain.exact_formulas import compile_exact_formula
from app.domain.formulas import FormulaValidationError
from tests.test_exact_formulas import DATA, run

CONDITIONAL = Dataset(
    DATA.frame.with_columns(
        pl.Series("flag", [True, False, None]),
        pl.Series("category", ["A", "B", None]),
        pl.Series("start", [date(2026, 1, 1), date(2026, 2, 1), None]),
        pl.Series("end", [date(2026, 2, 1), date(2026, 1, 1), None]),
    ),
    DatasetSchema(
        (
            *DATA.schema.columns,
            ColumnSchema("flag_id", "flag", "Flag", T.BOOLEAN, True),
            ColumnSchema("category_id", "category", "Category", T.STRING, True),
            ColumnSchema("start_id", "start", "Start", T.DATE, True),
            ColumnSchema("end_id", "end", "End", T.DATE, True),
        )
    ),
)


@pytest.mark.parametrize(
    ("expression", "expected"),
    [
        ("if_else(quantity != 0, amount / quantity, 0)", ["3002399751580331.04", "0.00", "0.00"]),
        (
            "if_else(is_null(quantity), None, if_else(quantity == 0, 0, amount / quantity))",
            ["3002399751580331.04", "0.00", None],
        ),
        ("if_else(flag, amount + 0.01, -1)", ["9007199254740993.12", "-1.00", "-1.00"]),
        ("if_else(category == 'A', amount, 0)", ["9007199254740993.11", "0.00", "0.00"]),
        ("if_else(start < end, amount, 0)", ["9007199254740993.11", "0.00", "0.00"]),
        ("if_else(amount > 9007199254740993.10, 1, 0)", ["1.00", "0.00", "0.00"]),
        ("if_else(amount == 9007199254740993.11, 1, 0)", ["1.00", "0.00", "0.00"]),
        (
            "if_else([amount_id] == 9007199254740993.11, 9007199254740993.12, -0.01)",
            ["9007199254740993.12", "-0.01", "-0.01"],
        ),
        ("if_else(amount <= 9007199254740993.10, 1, 0)", ["0.00", "1.00", "0.00"]),
        ("if_else(is_null(category) or category == 'A', 1, 0)", ["1.00", "0.00", "1.00"]),
        ("if_else(not is_null(flag) and flag != False, 1, 0)", ["1.00", "0.00", "0.00"]),
        ("if_else(flag == True, 1, 0)", ["1.00", "0.00", "0.00"]),
        ("if_else(is_null(start), 1, 0)", ["0.00", "0.00", "1.00"]),
        ("if_else(None == None, 1, 0)", ["0.00"] * 3),
        ("if_else(category != 'A', 1, 0)", ["0.00", "1.00", "0.00"]),
        ("if_else(category >= 'B', 1, 0)", ["0.00", "1.00", "0.00"]),
        (
            "if_else(quantity >= 0, if_else(quantity > 0, 1.005, 1.015), None)",
            ["1.00", "1.02", None],
        ),
    ],
)
def test_typed_conditions_exact_values_and_nulls(expression, expected):
    with localcontext() as context:
        context.prec = 2
        result = run(expression, CONDITIONAL)
    assert result.frame["result"].to_list() == [None if v is None else Decimal(v) for v in expected]
    assert result.frame.schema["result"] == pl.Decimal(38, 2)


@pytest.mark.parametrize(
    "expression",
    [
        "if_else(True, 0.1+0.2, 1/0)",
        "if_else(False, 1/0, 0.1+0.2)",
        "if_else(False and 1/0 > 0, 1/0, 0.1+0.2)",
        "if_else(True or 1/0 > 0, 0.1+0.2, 1/0)",
        "if_else(is_null(None), 0.1+0.2, 1e37*1e37*1e37*1e37*1e37)",
        "if_else(is_null(flag) and False, 1/0, 0.1+0.2)",
    ],
)
def test_unused_branches_are_lazy_but_result_is_rounded_once(expression):
    assert run(expression, CONDITIONAL).frame["result"].to_list() == [Decimal("0.30")] * 3


@pytest.mark.parametrize(("a", "b"), list(product([True, False, None], repeat=2)))
def test_three_valued_boolean_logic(a, b):
    frame = pl.DataFrame(
        {"a": pl.Series([a], dtype=pl.Boolean), "b": pl.Series([b], dtype=pl.Boolean)}
    )
    source = Dataset(
        frame, DatasetSchema(tuple(ColumnSchema(s, s, s, T.BOOLEAN, True) for s in ("a", "b")))
    )
    expected_and = False if a is False or b is False else None if a is None or b is None else True
    expected_or = True if a is True or b is True else None if a is None or b is None else False
    # Nested branch distinguishes null predicates from False through not.
    for expr, expected in [
        ("a and b", expected_and),
        ("a or b", expected_or),
        ("not a", None if a is None else not a),
    ]:
        actual = run(f"if_else({expr}, 1, if_else(not ({expr}), 0, -1))", source).frame["result"][0]
        assert actual == Decimal(-1 if expected is None else int(expected))


@pytest.mark.parametrize(
    "expression",
    [
        "if_else(1, 2, 3)",
        "if_else('yes', 2, 3)",
        "if_else(None, 2, 3)",
        "if_else(flag, True, 3)",
        "if_else(flag, '1.00', 3)",
        "if_else(flag, amount, approximate)",
        "if_else(approximate > 0, 1, 0)",
        "if_else(is_null(approximate), 1, 0)",
        "if_else(category == 1, 1, 0)",
        "if_else(flag < True, 1, 0)",
        "if_else(start == '2026-01-01', 1, 0)",
        "if_else(0 < quantity < 4, 1, 0)",
        "if_else(flag & True, 1, 0)",
        "if_else(category in ['A'], 1, 0)",
        "if_else(flag is True, 1, 0)",
        "if_else(True, 1, __import__('os'))",
        "if_else(True, 1, missing)",
        "if_else(True, 1)",
        "if_else(condition=True, value=1, otherwise=0)",
        "if_else(is_null(amount, 1), 1, 0)",
        "if_else(True and 1, 1, 0)",
        "if_else(not amount, 1, 0)",
        "if_else(flag, 1, amount.__class__)",
    ],
)
def test_static_validation_checks_even_unused_branches(expression):
    with pytest.raises(FormulaValidationError):
        compile_exact_formula(expression, CONDITIONAL.schema)


def test_references_include_conditions_both_branches_and_survive_renames():
    expression = (
        "if_else([category_id] == '[not_a_field]', [amount_id], "
        "if_else([flag_id], [quantity_id], None))"
    )
    compiled = compile_exact_formula(expression, CONDITIONAL.schema)
    assert compiled.referenced_columns == ("category_id", "amount_id", "flag_id", "quantity_id")
    renamed = Dataset(
        CONDITIONAL.frame.rename({"category": "kind", "amount": "money"}),
        DatasetSchema(
            tuple(
                replace(
                    c,
                    engine_name={"category": "kind", "amount": "money"}.get(
                        c.engine_name, c.engine_name
                    ),
                )
                for c in CONDITIONAL.schema.columns
            )
        ),
    )
    assert (
        run(expression, renamed).frame["result"].to_list()
        == run(expression, CONDITIONAL).frame["result"].to_list()
    )
    assert run(expression, CONDITIONAL).schema.columns[-1].metadata["source_columns"] == list(
        compiled.referenced_columns
    )


def test_selected_late_failure_empty_rows_and_predicate_runtime_schema():
    source = Dataset(
        pl.DataFrame({"quantity": [0] * 100 + [1]}), DatasetSchema((DATA.schema.columns[1],))
    )
    with pytest.raises(NodeExecutionError, match="division by zero"):
        run("if_else(quantity == 0, 0, 1/0)", source)
    assert (
        run(
            "if_else(flag, amount/quantity, 0)",
            Dataset(CONDITIONAL.frame.head(0), CONDITIONAL.schema),
        ).row_count
        == 0
    )
    invalid = Dataset(pl.DataFrame({"flag": [1]}), DatasetSchema((CONDITIONAL.schema.columns[3],)))
    with pytest.raises(NodeExecutionError, match="declared schema"):
        run("if_else(flag, 1, 0)", invalid)


def test_compatible_datetime_fields_and_explicit_timezones():
    frame = pl.DataFrame(
        {
            "a": [datetime(2026, 1, 1, tzinfo=UTC)],
            "b": [datetime(2026, 2, 1, tzinfo=UTC)],
        }
    )
    schema = DatasetSchema(
        tuple(ColumnSchema(s, s, s, T.DATETIME, False, {"timezone": "UTC"}) for s in ("a", "b"))
    )
    assert run("if_else(a < b, 1, 0)", Dataset(frame, schema)).frame["result"][0] == Decimal(1)
    mixed = DatasetSchema(
        (schema.columns[0], replace(schema.columns[1], metadata={"timezone": "Europe/Moscow"}))
    )
    with pytest.raises(FormulaValidationError, match="timezones"):
        compile_exact_formula("if_else(a < b, 1, 0)", mixed)


def test_decimal_oracle_for_conditional_discount_and_single_rounding():
    for cents in range(-100, 201, 11):
        amount = Decimal(cents) / 100
        with localcontext() as context:
            context.prec = 80
            expected = (amount * Decimal("0.85") if amount > Decimal("1.00") else amount).quantize(
                Decimal("0.01")
            )
        assert (
            run(f"if_else({amount} > 1.00, {amount} * 0.85, {amount})").frame["result"][0]
            == expected
        )
