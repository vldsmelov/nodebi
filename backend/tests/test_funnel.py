from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, polars_to_logical
from app.domain.funnel import FunnelConfig
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue, ValueConnectionError, ValueSchema
from app.domain.workflows import NodeInstance, Position
from app.nodes.funnel import FunnelExecutor

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def execute(rows, dtype=pl.Int64, identity=None, scale=None):
    frame = pl.DataFrame(
        rows, schema={"stage": pl.String, "order": pl.Int64, "value": dtype}, orient="row"
    )
    schema = DatasetSchema(
        tuple(
            ColumnSchema(
                name,
                name,
                name,
                polars_to_logical(kind),
                True,
                {
                    "currency": "RUB",
                    **(
                        {"scale": dtype.scale if scale is None else scale}
                        if name == "value" and isinstance(dtype, pl.Decimal)
                        else {}
                    ),
                },
            )
            for name, kind in frame.schema.items()
        )
    )
    source = Dataset(frame, schema)
    node = NodeInstance(
        identity or uuid4(),
        "funnel_steps",
        1,
        Position(0, 0),
        dict(stage_column_id="stage", order_column_id="order", value_column_id="value"),
    )
    executor = FunnelExecutor()
    inferred = executor.infer_outputs(
        node, {"input": ValueSchema("dataset", table=schema)}, CONTEXT
    )
    outputs = executor.execute_outputs(
        node,
        {"input": TableValue(RowContext(CONTEXT.workflow_id, uuid4(), "dataset"), source)},
        CONTEXT,
    )
    assert all(outputs[port].dataset.schema == inferred[port].table for port in outputs)
    return {port: value.dataset for port, value in outputs.items()}


def test_explicit_order_full_retention_loss_and_stable_identities():
    rows = [("Sale", 30, 20), ("Lead", 10, 100), ("Qualified", 20, 40)]
    identity = uuid4()
    output = execute(rows, identity=identity)
    result = output["dataset"].frame.to_dicts()
    assert [r["stage"] for r in result] == ["Lead", "Qualified", "Sale"]
    assert [r["order"] for r in result] == [10, 20, 30]
    assert [r["previous_percent"] for r in result] == [None, 40, 50]
    assert [r["initial_percent"] for r in result] == [100, 40, 20]
    assert [r["loss"] for r in result] == [None, 60, 20]
    assert result[2]["previous_exact"] == "0.5"
    assert output["summary"].frame.row(0) == (3, 100, 20, 20, "0.2")
    assert execute(rows[::-1], identity=identity)["dataset"].frame.to_dicts() == result
    assert output["dataset"].schema.by_name("loss").metadata["currency"] == "RUB"


def test_exact_decimals_close_large_values_and_ambient_context():
    with localcontext() as context:
        context.prec = 2
        output = execute(
            [("A", 0, Decimal("9007199254740993.02")), ("B", 1, Decimal("9007199254740993.01"))],
            dtype=pl.Decimal(38, 2),
        )
    result = output["dataset"].frame.to_dicts()
    assert result[1]["loss"] == Decimal("0.01")
    assert result[1]["previous_exact"] == "900719925474099301/900719925474099302"
    assert result[1]["value"] == Decimal("9007199254740993.01")
    with pytest.raises(ValueConnectionError, match="must not increase"):
        execute(
            [("A", 0, Decimal("9007199254740993.01")), ("B", 1, Decimal("9007199254740993.02"))],
            dtype=pl.Decimal(38, 2),
        )


def test_repeating_fraction_rounding_and_zero_denominators():
    rows = execute([("A", 1, 3), ("B", 2, 1), ("C", 3, 0), ("D", 4, 0)])["dataset"].frame.to_dicts()
    assert rows[1]["previous_percent"] == Decimal("33.333333333333")
    assert rows[1]["previous_exact"] == "1/3"
    assert rows[2]["previous_percent"] == 0
    assert rows[3]["previous_percent"] is None
    assert rows[3]["loss"] == 0
    assert rows[3]["initial_percent"] == 0


@pytest.mark.parametrize("rows", [[], [("A", 1, 0)], [("A", 1, 0), ("B", 2, 0)]])
def test_empty_and_zero_initial_do_not_invent_retention(rows):
    output = execute(rows)
    assert output["summary"].frame["overall_percent"][0] is None
    assert all(r["initial_exact"] is None for r in output["dataset"].frame.to_dicts())
    assert output["summary"].frame["initial_value"][0] == (0 if rows else None)


@pytest.mark.parametrize(
    "rows,message",
    [
        ([("A", 1, 1), ("B", 2, 2)], "must not increase"),
        ([("A", 1, -1)], "negative"),
        ([("A", 1, None)], "cannot be empty"),
        ([(None, 1, 1)], "non-empty"),
        ([(" ", 1, 1)], "non-empty"),
        ([("A", 1, 1), ("A", 2, 1)], "one row"),
        ([("A", 1, 1), ("B", 1, 1)], "unique"),
        ([("A", None, 1)], "unique"),
        ([(str(i), i, 1) for i in range(51)], "at most 50"),
    ],
)
def test_invalid_prepared_stages_fail(rows, message):
    with pytest.raises(ValueConnectionError, match=message):
        execute(rows)


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf")])
def test_nonfinite(value):
    with pytest.raises(ValueConnectionError, match="finite"):
        execute([("A", 1, value)], dtype=pl.Float64)


def test_float_semantics_and_schema_validation():
    result = execute([("A", 1, 0.3), ("B", 2, 0.1)], dtype=pl.Float64)["dataset"].frame.to_dicts()
    assert result[1]["loss"] == 0.2 and result[1]["previous_exact"] == "1/3"
    with pytest.raises(ValueError, match="separate"):
        FunnelConfig(stage_column_id="same", order_column_id="same", value_column_id="v")
    with pytest.raises(ValueConnectionError, match="scale"):
        execute([("A", 1, Decimal("1.23"))], dtype=pl.Decimal(38, 2), scale=1)
