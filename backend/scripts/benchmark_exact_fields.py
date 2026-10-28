"""Nonpersistent exact field arithmetic -> sum benchmark; no source construction in timing."""

import argparse
import json
import time
import tracemalloc
from decimal import Decimal
from uuid import uuid4

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, ScalarValue, TableValue, project_field
from app.domain.workflows import NodeInstance, Position
from app.nodes.exact_field_formula import ExactFieldFormulaExecutor
from app.nodes.exact_field_operations import ExactFieldExecutor


def run(width: int, formula: bool = False) -> dict[str, object]:
    count = 100000
    frame = pl.DataFrame(
        {
            "amount": pl.Series([Decimal("9007199254740993.11")] * count, dtype=pl.Decimal(38, 2)),
            **{f"extra_{i}": [i] * count for i in range(width - 1)},
        }
    )
    schema = DatasetSchema(
        tuple(
            ColumnSchema(
                name,
                name,
                name,
                LogicalType.DECIMAL if name == "amount" else LogicalType.INTEGER,
                False,
                {"precision": 38, "scale": 2} if name == "amount" else {},
            )
            for name in frame.columns
        )
    )
    context = ExecutionContext(uuid4(), uuid4(), uuid4())
    table = TableValue(RowContext(context.workflow_id, uuid4(), "dataset"), Dataset(frame, schema))
    arithmetic = NodeInstance(
        uuid4(),
        "field_formula" if formula else "field_arithmetic",
        2,
        Position(0, 0),
        {"expression": "a / 3 * 3 + b", "scale": 2}
        if formula
        else {"operation": "add", "scale": 2},
    )
    total = NodeInstance(uuid4(), "field_sum", 2, Position(0, 0), {})
    executor = ExactFieldExecutor()
    calculator = ExactFieldFormulaExecutor() if formula else executor

    def execute() -> None:
        field = calculator.execute_outputs(
            arithmetic,
            {
                "a": project_field(table, "amount"),
                "b": ScalarValue(
                    Decimal("0.01"), LogicalType.DECIMAL, {"precision": 38, "scale": 2}
                ),
            },
            context,
        )["value"]
        result = executor.execute_outputs(total, {"table": table, "value": field}, context)["value"]
        assert isinstance(result, ScalarValue)
        assert result.value == Decimal("900719925474099312000.00")

    elapsed = []
    for _ in range(2):
        start = time.perf_counter()
        execute()
        elapsed.append(round(time.perf_counter() - start, 3))
    tracemalloc.start()
    execute()
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "operation": arithmetic.type,
        "rows": count,
        "columns": width,
        "cold_seconds": elapsed[0],
        "repeat_seconds": elapsed[1],
        "python_peak_mib": round(peak / 1024**2, 2),
        "source_polars_mib": round(frame.estimated_size() / 1024**2, 2),
        "note": (
            "Repeat is uncached; traced memory excludes native allocations/source construction."
        ),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--formula", action="store_true", help="Benchmark one exact field expression."
    )
    args = parser.parse_args()
    print(json.dumps([run(2, args.formula), run(100, args.formula)], indent=2))
