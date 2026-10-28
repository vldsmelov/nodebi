"""Non-persistent exact-formula benchmark.

Run from backend: python -m scripts.benchmark_exact_formulas.
"""

import json
import time
import tracemalloc
from decimal import Decimal
from uuid import uuid4

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext, TypedNodeExecutor
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry


def run(
    rows: int, width: int, *, conditional: bool = False, trace_memory: bool = True
) -> dict[str, object]:
    frame = pl.DataFrame(
        {
            "price": pl.Series([Decimal("9007199254740993.11")] * rows, dtype=pl.Decimal(38, 2)),
            "quantity": pl.Series(
                [0 if conditional and index % 4 == 0 else 3 for index in range(rows)],
                dtype=pl.Int64,
            ),
            **{
                f"unused_{index}": pl.Series([index] * rows, dtype=pl.Int64)
                for index in range(width - 2)
            },
        }
    )
    source = Dataset(
        frame,
        DatasetSchema(
            tuple(
                ColumnSchema(
                    name,
                    name,
                    name,
                    LogicalType.DECIMAL if name == "price" else LogicalType.INTEGER,
                    False,
                    {"precision": 38, "scale": 2} if name == "price" else {},
                )
                for name in frame.columns
            )
        ),
    )
    executor = get_node_registry().get("calculated_column", 2).executor
    assert not isinstance(executor, TypedNodeExecutor)
    node = NodeInstance(
        uuid4(),
        "calculated_column",
        2,
        Position(0, 0),
        {
            "name": "revenue",
            "expression": (
                "if_else(quantity != 0 and price > 9007199254740993.10, "
                "price * quantity * (1 - 0.15) / quantity, 0)"
                if conditional
                else "price * quantity * (1 - 0.15) / 3"
            ),
            "scale": 2,
        },
    )
    context = ExecutionContext(uuid4(), uuid4(), uuid4())
    durations = []
    for _ in range(2):
        started = time.perf_counter()
        result = executor.execute(node, {"input": source}, context)
        durations.append(round(time.perf_counter() - started, 3))
        assert result.row_count == rows
        expected = {Decimal("7656119366529844.14")}
        if conditional:
            expected.add(Decimal("0.00"))
            assert result.frame["revenue"].eq(0).sum() == (rows + 3) // 4
        assert set(result.frame["revenue"].unique().to_list()) == expected
    peak = None
    if trace_memory:
        tracemalloc.start()
        executor.execute(node, {"input": source}, context)
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
    return {
        "rows": rows,
        "columns": width,
        "conditional": conditional,
        "cold_seconds": durations[0],
        "repeat_seconds": durations[1],
        "python_peak_mib": round(peak / 1024**2, 2) if peak is not None else None,
        "output_polars_mib": round(result.frame.estimated_size() / 1024**2, 2),
        "note": (
            "Python memory tracing is optional (no native allocations); "
            "repeat is not a cache hit. Source construction excluded."
        ),
    }


if __name__ == "__main__":
    print(
        json.dumps(
            [run(100000, width, conditional=mode) for mode in (False, True) for width in (2, 100)],
            indent=2,
        )
    )
