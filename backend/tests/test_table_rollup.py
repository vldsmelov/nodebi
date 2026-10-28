from copy import deepcopy
from datetime import date
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue, ValueSchema
from app.domain.workflows import NodeInstance, Position
from app.nodes.table_rollup import TableRollupConfig, TableRollupExecutor

CONTEXT = ExecutionContext(uuid4(), uuid4(), uuid4())


def measure(operation, name=None, **patch):
    return {
        "output_id": str(uuid4()),
        "name": name or operation,
        "operation": operation,
        **({"column_id": "v"} if operation != "count_rows" else {}),
        **({"denominator_column_id": "d"} if operation == "ratio_of_sums" else {}),
        **patch,
    }


def run(
    rows,
    *,
    dtype=pl.Int64,
    node_id=None,
    measures=None,
    metadata=None,
    dimension_type=pl.String,
    **patch,
):
    kind = (
        LogicalType.DECIMAL
        if isinstance(dtype, pl.Decimal)
        else LogicalType.FLOAT
        if dtype == pl.Float64
        else LogicalType.INTEGER
    )
    schema = DatasetSchema(
        (
            ColumnSchema(
                "a",
                "a",
                "Region",
                {
                    pl.String: LogicalType.STRING,
                    pl.Date: LogicalType.DATE,
                    pl.Boolean: LogicalType.BOOLEAN,
                    pl.Int64: LogicalType.INTEGER,
                }[dimension_type],
                True,
            ),
            ColumnSchema("b", "b", "Branch", LogicalType.STRING, True),
            *(
                ColumnSchema(
                    key,
                    key,
                    key,
                    kind,
                    True,
                    {
                        **(
                            {"scale": dtype.scale, "currency": "RUB"}
                            if isinstance(dtype, pl.Decimal)
                            else {}
                        ),
                        **(metadata or {}).get(key, {}),
                    },
                )
                for key in ("v", "d")
            ),
        )
    )
    source = Dataset(
        pl.DataFrame(
            rows, schema={"a": dimension_type, "b": pl.String, "v": dtype, "d": dtype}, orient="row"
        ),
        schema,
    )
    node = NodeInstance(
        node_id or uuid4(),
        "table_rollup",
        1,
        Position(0, 0),
        {"dimensions": ["a", "b"], "measures": measures or [measure("sum")], **patch},
    )
    executor = TableRollupExecutor()
    inferred = executor.infer_outputs(
        node, {"input": ValueSchema("dataset", table=schema)}, CONTEXT
    )
    result = executor.execute_outputs(
        node,
        {"input": TableValue(RowContext(CONTEXT.workflow_id, uuid4(), "dataset"), source)},
        CONTEXT,
    )["dataset"].dataset
    assert result.schema == inferred["dataset"].table
    return result


def values(dataset):
    names = {
        c.engine_name: c.display_name
        for c in dataset.schema.columns
        if c.metadata.get("rollup_role") == "measure"
    }
    return [
        {
            **{key: value for key, value in row.items() if key not in names},
            **{label: row[key] for key, label in names.items()},
        }
        for row in dataset.frame.to_dicts()
    ]


def test_hierarchy_totals_use_observations_not_averages_or_ratios():
    result = run(
        [
            ("North", "A", 10, 2),
            ("North", "B", 20, 10),
            ("North", "B", 30, 3),
            ("South", "C", None, 0),
        ],
        measures=[
            measure(op)
            for op in ("sum", "average", "min", "max", "count", "count_rows", "ratio_of_sums")
        ],
    )
    rows = values(result)
    assert [r["kind"] for r in rows] == [
        "detail",
        "detail",
        "subtotal",
        "detail",
        "subtotal",
        "grand_total",
    ]
    assert [r["source_count"] for r in rows] == [1, 2, 3, 1, 1, 4]
    assert rows[2]["average"] == Decimal("20.000000")  # Not (10 + 25) / 2.
    assert rows[2]["ratio_of_sums"] == Decimal("4.000000")  # Not sum/average of leaf ratios.
    assert rows[2]["min"] == 10 and rows[2]["max"] == 30
    assert rows[0]["parent_id"] == rows[2]["row_id"]
    assert rows[2]["parent_id"] == rows[-1]["row_id"] and rows[-1]["parent_id"] is None
    assert rows[-1]["sum"] == 60 and rows[-1]["count"] == 3 and rows[-1]["count_rows"] == 4
    assert rows[3]["sum"] is None and rows[3]["count"] == 0 and rows[3]["ratio_of_sums"] is None


def test_exact_rounding_occurs_once_per_level_and_global_context_cannot_change_it():
    measures = [measure("sum"), measure("average", scale=2), measure("ratio_of_sums", scale=2)]
    rows = [
        ("A", "a", Decimal("9007199254740993.11"), Decimal("1.00")),
        ("A", "b", Decimal("-9007199254740993.10"), Decimal("2.00")),
        ("A", "c", Decimal("0.02"), Decimal("0.00")),
    ]
    with localcontext() as context:
        context.prec = 2
        result = run(rows, dtype=pl.Decimal(38, 2), measures=measures)
    assert values(result)[-1]["sum"] == Decimal("0.03")
    assert values(result)[-1]["average"] == Decimal("0.01")
    assert values(result)[-1]["ratio_of_sums"] == Decimal("0.01")
    columns = {c.display_name: c for c in result.schema.columns}
    assert columns["sum"].metadata["currency"] == "RUB"
    assert "currency" not in columns["ratio_of_sums"].metadata
    assert columns["ratio_of_sums"].metadata["unit"] == "ratio"


@pytest.mark.parametrize(
    "raw,expected", [("1.005", "1.00"), ("1.015", "1.02"), ("-1.005", "-1.00")]
)
def test_half_even(raw, expected):
    result = run(
        [("A", "B", Decimal(raw), Decimal("1"))],
        dtype=pl.Decimal(38, 3),
        measures=[measure("average", scale=2)],
    )
    assert all(row["average"] == Decimal(expected) for row in values(result))


def test_null_groups_are_not_total_placeholders_and_identity_survives_reordering():
    node_id = uuid4()
    measures = [measure("sum"), measure("average")]
    rows = [(None, None, 1, 1), (None, "B", 2, 1), ("A", None, 3, 1)]
    first = run(rows, node_id=node_id, measures=measures)
    second = run(
        rows[::-1],
        node_id=node_id,
        measures=[{**m, "name": "renamed " + m["name"]} for m in measures[::-1]],
    )
    assert set(first.frame["row_id"]) == set(second.frame["row_id"])
    assert {c.column_id for c in first.schema.columns} == {
        c.column_id for c in second.schema.columns
    }
    null_rows = [
        row for row in values(first) if row["dimension_0"] is None and row["dimension_1"] is None
    ]
    assert {r["kind"] for r in null_rows} == {"detail", "subtotal", "grand_total"}
    assert len({r["row_id"] for r in null_rows}) == 3


@pytest.mark.parametrize(
    "subtotals,grand,expected",
    [(False, False, 2), (False, True, 3), (True, False, 3), (True, True, 4)],
)
def test_optional_levels_and_parent_links(subtotals, grand, expected):
    result = run([("A", "B", 1, 1), ("A", "C", 2, 1)], subtotals=subtotals, grand_total=grand)
    rows = values(result)
    assert len(rows) == expected
    assert all(
        row["parent_id"] is None or row["parent_id"] in {r["row_id"] for r in rows} for row in rows
    )


def test_empty_all_null_and_no_dimensions():
    measures = [measure("sum"), measure("count_rows"), measure("count"), measure("ratio_of_sums")]
    empty = values(run([], measures=measures))
    assert len(empty) == 1 and empty[0]["kind"] == "grand_total"
    assert empty[0]["sum"] is None and empty[0]["count_rows"] == empty[0]["count"] == 0
    assert run([], measures=measures, grand_total=False).row_count == 0
    total = values(run([("A", "B", 1, 2), ("A", "C", 3, 2)], measures=measures, dimensions=[]))
    assert len(total) == 1 and total[0]["sum"] == 4 and total[0]["ratio_of_sums"] == 1
    # Source row count remains available when no columns are projected.
    assert (
        values(run([("A", "B", 1, 2)] * 7, dimensions=[], measures=[measure("count_rows")]))[0][
            "count_rows"
        ]
        == 7
    )


def test_independent_ratio_sums_zero_and_missing_denominator():
    rows = [("A", "B", 10, None), ("A", "B", None, 2), ("A", "C", 3, 0)]
    result = values(run(rows, measures=[measure("ratio_of_sums")]))
    assert result[0]["ratio_of_sums"] == 5
    assert result[1]["ratio_of_sums"] is None
    assert result[-1]["ratio_of_sums"] == Decimal("6.500000")


@pytest.mark.parametrize("bad", [float("inf"), float("-inf"), float("nan")])
def test_nonfinite_rejected(bad):
    with pytest.raises(ValueError, match="finite"):
        run([("A", "B", bad, 1.0)], dtype=pl.Float64)


def test_overflow_is_explicit_but_exact_cancellation_is_allowed():
    huge = Decimal("9" * 38)
    with pytest.raises(ValueError, match="precision"):
        run([("A", "B", huge, None)] * 2, dtype=pl.Decimal(38, 0))
    assert (
        values(
            run(
                [("A", "B", huge, None), ("A", "B", huge.copy_negate(), None)],
                dtype=pl.Decimal(38, 0),
            )
        )[-1]["sum"]
        == 0
    )
    with pytest.raises(ValueError, match="precision"):
        run([("A", "B", 1e308, None)] * 2, dtype=pl.Float64)


def test_full_data_beyond_preview_and_output_capacity():
    result = values(run([("A", "B", i, 1) for i in range(100001)]))
    assert result[-1]["source_count"] == 100001
    assert result[-1]["sum"] == 100000 * 100001 // 2
    with pytest.raises(ValueError, match="20000"):
        run([("A", str(i), 1, 1) for i in range(20000)])  # Totals also consume capacity.


@pytest.mark.parametrize(
    "failure",
    [
        "field",
        "dimension",
        "duplicate",
        "name",
        "denominator",
        "count_field",
        "missing_value",
        "empty_dimensions",
        "numeric_dimension",
        "identity",
        "operation",
    ],
)
def test_invalid_config(failure):
    config = {"dimensions": ["a", "b"], "measures": [measure("sum")]}
    if failure == "field":
        config["measures"][0]["column_id"] = "removed"
    elif failure == "dimension":
        config["dimensions"] = ["removed"]
    elif failure == "duplicate":
        config["dimensions"] = ["a", "a"]
    elif failure == "name":
        config["measures"][0]["name"] = " "
    elif failure == "denominator":
        config["measures"][0]["denominator_column_id"] = "d"
    elif failure == "count_field":
        config["measures"][0]["operation"] = "count_rows"
    elif failure == "missing_value":
        config["measures"][0].pop("column_id")
    elif failure == "empty_dimensions":
        config.update(dimensions=[], grand_total=False)
    elif failure == "numeric_dimension":
        config["measures"][0]["column_id"] = "a"
    elif failure == "identity":
        config["measures"].append({**deepcopy(config["measures"][0]), "name": "Another"})
    else:
        config["measures"][0]["operation"] = "implicit"
    with pytest.raises(ValueError):
        run([("A", "B", 1, 1)], **config)


def test_config_does_not_accept_arbitrary_settings():
    with pytest.raises(ValueError):
        TableRollupConfig.model_validate({"measures": [measure("sum")], "script": "unsafe"})


def test_ratio_preserves_quotient_units_and_does_not_invent_unknown_units():
    measure_config = [measure("ratio_of_sums")]
    result = run(
        [("A", "B", 10, 2)],
        measures=measure_config,
        metadata={"v": {"currency": "RUB"}, "d": {"unit": "pcs"}},
    )
    metadata = result.schema.columns[-1].metadata
    assert metadata["unit"] == "(RUB) / (pcs)"
    assert metadata["numerator_unit"] == "RUB" and metadata["denominator_unit"] == "pcs"
    unknown = run([("A", "B", 10, 2)], measures=measure_config)
    assert "unit" not in unknown.schema.columns[-1].metadata
    assert unknown.schema.columns[-1].metadata["numerator_unit"] is None


@pytest.mark.parametrize(
    "dimension_type,key",
    [(pl.Date, date(2026, 1, 1)), (pl.Boolean, False), (pl.Int64, 9007199254740993)],
)
def test_typed_dimension_values_survive_hierarchy(dimension_type, key):
    result = run(
        [(key, "B", 1, 1), (None, "B", 2, 1)],
        dimension_type=dimension_type,
        dimensions=["a", "b", "v"],
    )
    rows = values(result)
    assert rows[0]["dimension_0"] == key
    assert result.frame.schema["dimension_0"] == dimension_type
    assert {row["depth"] for row in rows} == {0, 1, 2, 3}
    assert rows[-1]["sum"] == 3
