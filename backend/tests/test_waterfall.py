from datetime import date
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue, ValueConnectionError, ValueSchema
from app.domain.workflows import NodeInstance, Position
from app.nodes.waterfall import WaterfallConfig, WaterfallExecutor

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def run(rows, *, dtype=pl.Int64, label_type=pl.String, node_id=None, **config):
    kinds = {
        pl.String: LogicalType.STRING,
        pl.Int64: LogicalType.INTEGER,
        pl.Float64: LogicalType.FLOAT,
        pl.Date: LogicalType.DATE,
        pl.Boolean: LogicalType.BOOLEAN,
    }
    number_kind = LogicalType.DECIMAL if isinstance(dtype, pl.Decimal) else kinds[dtype]
    schema = DatasetSchema(
        (
            ColumnSchema("label", "label", "Step", kinds[label_type], True),
            ColumnSchema(
                "value",
                "value",
                "Amount",
                number_kind,
                True,
                {
                    "currency": "RUB",
                    **({"scale": dtype.scale} if isinstance(dtype, pl.Decimal) else {}),
                },
            ),
            ColumnSchema("kind", "kind", "Kind", LogicalType.STRING, True),
        )
    )
    source = Dataset(
        pl.DataFrame(
            rows, schema={"label": label_type, "value": dtype, "kind": pl.String}, orient="row"
        ),
        schema,
    )
    node = NodeInstance(
        node_id or uuid4(),
        "waterfall_steps",
        1,
        Position(0, 0),
        {
            "category_column_id": "label",
            "value_column_id": "value",
            "kind_column_id": "kind",
            **config,
        },
    )
    executor = WaterfallExecutor()
    inferred = executor.infer_outputs(
        node, {"input": ValueSchema("dataset", table=schema)}, CONTEXT
    )
    output = executor.execute_outputs(
        node,
        {"input": TableValue(RowContext(CONTEXT.workflow_id, uuid4(), "dataset"), source)},
        CONTEXT,
    )["dataset"].dataset
    assert output.schema == inferred["dataset"].table
    return output


def test_explicit_initial_subtotals_and_final_do_not_double_count():
    result = run(
        [
            ("Opening", 100, "initial"),
            ("Sales", 20, "change"),
            ("Cost", -150, "change"),
            ("Subtotal", None, "subtotal"),
            ("Recovery", 40, "change"),
            ("Closing", 10, "total"),
        ]
    )
    rows = result.frame.to_dicts()
    assert [r["balance"] for r in rows] == [100, 120, -30, -30, 10, 10]
    assert [r["start"] for r in rows] == [0, 100, 120, 0, -30, 0]
    assert [r["end"] for r in rows] == [100, 120, -30, -30, 10, 10]
    assert [r["value"] for r in rows] == [100, 20, -150, -30, 40, 10]
    assert result.schema.by_name("balance").metadata["currency"] == "RUB"
    assert result.schema.by_name("balance").metadata["scale"] == 0
    assert result.metadata["exact_transport"]


def test_exact_decimal_cancellation_under_small_context_and_stable_step_ids():
    identity = uuid4()
    rows = [
        ("Opening", Decimal("9007199254740993.11"), "initial"),
        ("Cost", Decimal("-9007199254740993.10"), "change"),
        ("Total", None, "total"),
    ]
    with localcontext() as context:
        context.prec = 2
        output = run(rows, dtype=pl.Decimal(38, 2), node_id=identity)
    assert str(output.frame["balance"][-1]) == "0.01"
    first = run([("A", 10, "change"), ("B", -3, "change")], node_id=identity)
    second = run([("B", -3, "change"), ("A", 10, "change")], node_id=identity)
    assert first.frame["step_id"].to_list() == second.frame["step_id"].to_list()[::-1]
    assert first.frame["balance"].to_list() == [10, 7]
    assert second.frame["balance"].to_list() == [
        -3,
        7,
    ]  # Input order intentionally changes the path.


def test_plain_contributions_generated_total_and_empty_input():
    result = run(
        [("A", -5, None), ("B", 0, None), ("C", 3, None)],
        kind_column_id=None,
        append_total=True,
        total_label="Closing",
    )
    assert result.frame["kind"].to_list() == ["change", "change", "change", "total"]
    assert result.frame["value"].to_list() == [-5, 0, 3, -2]
    assert result.frame["generated"].to_list() == [False, False, False, True]
    assert result.frame["step_index"].to_list() == [1, 2, 3, 4]
    assert run([], append_total=True).row_count == 0  # No invented zero result for missing data.


def test_localized_marker_mapping_is_explicit():
    result = run(
        [("Остаток", 10, "Начало"), ("Расход", -4, "Движение"), ("Итого", None, "Итог")],
        initial_marker="Начало",
        change_marker="Движение",
        total_marker="Итог",
    )
    assert result.frame["kind"].to_list() == ["initial", "change", "total"]
    assert result.frame["balance"][-1] == 6


@pytest.mark.parametrize(
    "rows,match",
    [
        ([("A", None, "change")], "cannot be empty"),
        ([("A", None, "initial")], "cannot be empty"),
        ([("A", 1, "change"), ("B", 3, "subtotal")], "differs"),
        ([("A", 1, "change"), ("B", 0, "total")], "differs"),
        ([("A", 1, "change"), ("B", 2, "initial")], "first row"),
        ([("A", None, "subtotal")], "earlier"),
        ([("A", 1, "change"), ("B", None, "total"), ("C", 1, "change")], "last"),
        ([("A", 1, "delta")], "markers"),
        ([("A", 1, None)], "markers"),
        ([("A", 1, "change"), ("A", 1, "change")], "one row"),
        ([(None, 1, "change")], "non-empty"),
        ([(" ", 1, "change")], "non-empty"),
    ],
)
def test_invalid_data_fails_explicitly(rows, match):
    with pytest.raises(ValueConnectionError, match=match):
        run(rows)


def test_never_appends_second_final_total_or_ambiguous_label():
    with pytest.raises(ValueConnectionError, match="twice"):
        run([("A", 1, "change"), ("B", None, "total")], append_total=True)
    with pytest.raises(ValueConnectionError, match="differ from"):
        run([("Total", 1, "change")], append_total=True)


def test_all_steps_beyond_preview_participate_and_limit_never_truncates():
    rows = [(f"S{i}", 1, "change") for i in range(1999)]
    output = run(rows, append_total=True)
    assert output.row_count == 2000 and output.frame["balance"][-1] == 1999
    with pytest.raises(ValueConnectionError, match="2000"):
        run(rows + [("More", 1, "change")], append_total=True)
    with pytest.raises(ValueConnectionError, match="2000"):
        run([(f"S{i}", 1, "change") for i in range(100001)])


def test_float_values_keep_approximate_type_and_check_total_without_implicit_tolerance():
    output = run(
        [("A", 0.1, "change"), ("B", 0.2, "change"), ("C", 0.3, "total")], dtype=pl.Float64
    )
    assert output.schema.by_name("balance").logical_type == LogicalType.FLOAT
    assert output.frame["balance"][-1] == 0.3
    with pytest.raises(ValueConnectionError, match="differs"):
        run([("A", 0.1, "change"), ("C", 0.1000000000001, "total")], dtype=pl.Float64)


@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf")])
def test_non_finite_values_fail(value):
    with pytest.raises(ValueConnectionError, match="finite"):
        run([("A", value, "change")], dtype=pl.Float64)


def test_intermediate_overflow_is_not_hidden_by_later_cancellation():
    with pytest.raises(ValueConnectionError, match="numeric range"):
        run(
            [("A", 1e308, "change"), ("B", 1e308, "change"), ("C", -1e308, "change")],
            dtype=pl.Float64,
        )
    with pytest.raises(ValueConnectionError, match="decimal precision"):
        run(
            [("A", Decimal("9" * 38), "change"), ("B", Decimal(1), "change")],
            dtype=pl.Decimal(38, 0),
        )


@pytest.mark.parametrize(
    "label_type,labels",
    [
        (pl.Int64, [9007199254740992, 9007199254740993]),
        (pl.Date, [date(2026, 1, 1), date(2026, 2, 1)]),
        (pl.Boolean, [False, True]),
    ],
)
def test_typed_labels_have_distinct_identities(label_type, labels):
    result = run([(label, 1, "change") for label in labels], label_type=label_type)
    assert result.frame["step_id"].n_unique() == 2
    assert result.frame["category"].n_unique() == 2


@pytest.mark.parametrize(
    "patch",
    [
        {"category_column_id": "value"},
        {"kind_column_id": "label"},
        {"change_marker": "total"},
        {"total_marker": " "},
        {"total_label": " "},
    ],
)
def test_invalid_config(patch):
    with pytest.raises(ValueError):
        WaterfallConfig.model_validate(
            {"category_column_id": "label", "value_column_id": "value", **patch}
        )


def test_schema_errors_and_missing_inputs_have_domain_errors():
    for key in ("category_column_id", "value_column_id", "kind_column_id"):
        with pytest.raises(ValueConnectionError, match="unavailable"):
            run([], **{key: "gone"})
    with pytest.raises(ValueConnectionError, match="labels require"):
        run([], label_type=pl.Float64)
    node = NodeInstance(uuid4(), "waterfall_steps", 1, Position(0, 0), {})
    with pytest.raises(ValueConnectionError, match="upstream"):
        WaterfallExecutor().infer_outputs(node, {}, CONTEXT)
    with pytest.raises(ValueConnectionError, match="upstream"):
        WaterfallExecutor().execute_outputs(node, {}, CONTEXT)
