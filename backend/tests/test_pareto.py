from datetime import date
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, polars_to_logical
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue, ValueConnectionError, ValueSchema
from app.domain.workflows import NodeInstance, Position
from app.nodes.pareto import ParetoConfig, ParetoExecutor

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def execute(rows, dtype=pl.Int64, key_type=pl.String, identity=None, scale=None):
    frame = pl.DataFrame(rows, schema={"key": key_type, "value": dtype}, orient="row")
    source = Dataset(
        frame,
        DatasetSchema(
            (
                ColumnSchema("key", "key", "Category", polars_to_logical(key_type), True),
                ColumnSchema(
                    "value",
                    "value",
                    "Amount",
                    polars_to_logical(dtype),
                    True,
                    {
                        "currency": "RUB",
                        **(
                            {"scale": dtype.scale if scale is None else scale}
                            if isinstance(dtype, pl.Decimal)
                            else {}
                        ),
                    },
                ),
            )
        ),
    )
    node = NodeInstance(
        identity or uuid4(),
        "pareto",
        1,
        Position(0, 0),
        {"category_column_id": "key", "value_column_id": "value"},
    )
    executor = ParetoExecutor()
    inferred = executor.infer_outputs(
        node, {"input": ValueSchema("dataset", table=source.schema)}, CONTEXT
    )
    outputs = executor.execute_outputs(
        node,
        {"input": TableValue(RowContext(CONTEXT.workflow_id, uuid4(), "dataset"), source)},
        CONTEXT,
    )
    assert all(outputs[port].dataset.schema == inferred[port].table for port in outputs)
    return {port: value.dataset for port, value in outputs.items()}


def test_exact_rank_ties_full_shares_and_population():
    identity = uuid4()
    rows = [("B", 3), ("A", 3), ("C", 4), ("Zero", 0)]
    outputs = execute(rows, identity=identity)
    result = outputs["dataset"].frame.to_dicts()
    assert [r["category"] for r in result] == ["C", "A", "B", "Zero"]
    assert [r["rank"] for r in result] == [1, 2, 3, 4]
    assert [r["cumulative_value"] for r in result] == [4, 7, 10, 10]
    assert [r["cumulative_percent"] for r in result] == [40, 70, 100, 100]
    assert [r["share_exact"] for r in result] == ["0.4", "0.3", "0.3", "0"]
    assert outputs["summary"].frame.to_dicts() == [
        {"input_count": 4, "zero_count": 1, "total_value": Decimal(10)}
    ]
    assert execute(rows[::-1], identity=identity)["dataset"].frame.to_dicts() == result
    assert outputs["dataset"].schema.by_name("value").metadata["currency"] == "RUB"
    assert outputs["dataset"].schema.by_name("share_percent").metadata["unit"] == "%"


def test_repeating_shares_have_exact_fraction_companions_and_half_even_percentages():
    with localcontext() as context:
        context.prec = 2
        output = execute([("B", 1), ("A", 1), ("C", 1)])["dataset"].frame.to_dicts()
    assert output[0]["share_exact"] == "1/3"
    assert output[1]["cumulative_exact"] == "2/3"
    assert output[0]["share_percent"] == Decimal("33.333333333333")
    assert output[1]["cumulative_percent"] == Decimal("66.666666666667")
    assert output[-1]["cumulative_percent"] == Decimal(100)


def test_decimal_precision_and_order_do_not_pass_through_float():
    output = execute(
        [
            ("small", Decimal("9007199254740993.01")),
            ("large", Decimal("9007199254740993.02")),
        ],
        dtype=pl.Decimal(38, 2),
    )
    rows = output["dataset"].frame.to_dicts()
    assert [r["category"] for r in rows] == ["large", "small"]
    assert rows[-1]["cumulative_value"] == Decimal("18014398509481986.03")
    assert output["summary"].frame["total_value"][0] == rows[-1]["cumulative_value"]
    assert rows[0]["share_exact"] == "900719925474099302/1801439850948198603"


@pytest.mark.parametrize("rows", [[], [("B", 0), ("A", 0)]])
def test_empty_and_zero_population_has_undefined_shares(rows):
    output = execute(rows)
    assert output["summary"].frame.row(0) == (len(rows), len(rows), 0)
    for row in output["dataset"].frame.to_dicts():
        assert row["share_percent"] is None and row["share_exact"] is None
        assert row["cumulative_percent"] is None and row["cumulative_exact"] is None


@pytest.mark.parametrize(
    "keys,expected",
    [
        (["10", "2", "01"], ["01", "10", "2"]),
        ([10, 2, 1], [1, 2, 10]),
        ([True, False], [False, True]),
        ([date(2026, 2, 1), date(2026, 1, 1)], [date(2026, 1, 1), date(2026, 2, 1)]),
    ],
)
def test_native_tie_order(keys, expected):
    dtype = pl.Series(keys).dtype
    result = execute([(key, 1) for key in keys], key_type=dtype)["dataset"]
    assert result.frame["category"].to_list() == expected


@pytest.mark.parametrize(
    "rows,message",
    [
        ([("A", 1), ("A", 2)], "one row per category"),
        ([(None, 1)], "non-empty"),
        ([(" ", 1)], "non-empty"),
        ([("A", None)], "cannot be empty"),
        ([("A", -1)], "cannot be negative"),
    ],
)
def test_invalid_full_input(rows, message):
    with pytest.raises(ValueConnectionError, match=message):
        execute(rows)


@pytest.mark.parametrize("value", [float("inf"), float("nan"), float("-inf")])
def test_nonfinite(value):
    with pytest.raises(ValueConnectionError, match="finite"):
        execute([("A", value)], dtype=pl.Float64)


def test_float_semantics_and_overflow_are_explicit():
    result = execute([("A", 0.1), ("B", 0.2)], dtype=pl.Float64)
    assert result["summary"].frame["total_value"][0] == 0.3
    assert result["dataset"].frame["share_exact"].to_list() == ["2/3", "1/3"]
    with pytest.raises(ValueConnectionError, match="numeric range"):
        execute([("A", 1e308), ("B", 1e308)], dtype=pl.Float64)


def test_decimal_overflow_and_schema_drift_fail():
    with pytest.raises(ValueConnectionError, match="decimal precision"):
        execute([("A", Decimal("9" * 38)), ("B", Decimal("9" * 38))], dtype=pl.Decimal(38, 0))
    with pytest.raises(ValueConnectionError, match="declared decimal scale"):
        execute([("A", Decimal("1.25"))], dtype=pl.Decimal(38, 2), scale=1)


@pytest.mark.parametrize(
    "patch", [{"category_column_id": ""}, {"value_column_id": "key"}, {"aggregation": "sum"}]
)
def test_config_rejects_implicit_aggregation_and_invalid_bindings(patch):
    with pytest.raises(ValueError):
        ParetoConfig.model_validate(
            {"category_column_id": "key", "value_column_id": "value", **patch}
        )


def test_missing_input_and_fields_are_attributed():
    node = NodeInstance(
        uuid4(),
        "pareto",
        1,
        Position(0, 0),
        {"category_column_id": "key", "value_column_id": "value"},
    )
    with pytest.raises(ValueConnectionError, match="upstream dataset"):
        ParetoExecutor().execute_outputs(node, {}, CONTEXT)
    with pytest.raises(ValueConnectionError, match="upstream dataset"):
        ParetoExecutor().infer_outputs(node, {}, CONTEXT)
    with pytest.raises(ValueConnectionError, match="unavailable"):
        ParetoExecutor().infer_outputs(
            node, {"input": ValueSchema("dataset", table=DatasetSchema(()))}, CONTEXT
        )


def test_full_data_validation_beyond_preview_length():
    rows = [(str(i), 1) for i in range(10000)]
    with pytest.raises(ValueConnectionError, match="cannot be negative"):
        execute(rows + [("tail", -1)])
    with pytest.raises(ValueConnectionError, match="one row per category"):
        execute(rows + [("0", 1)])
