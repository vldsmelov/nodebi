"""Nonpersistent full-population exact-window benchmark; source construction excluded."""

import json
import time
import tracemalloc
from decimal import Decimal
from uuid import uuid4

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry


def run(width: int) -> dict[str, object]:
    count = 100000
    frame = pl.DataFrame(
        {
            "amount": pl.Series([Decimal("9007199254740993.11")] * count, dtype=pl.Decimal(38, 2)),
            "order": range(count),
            "group": [i % 100 for i in range(count)],
            **{f"extra_{i}": [i] * count for i in range(width - 3)},
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
    source = Dataset(frame, schema)
    node = NodeInstance(
        uuid4(),
        "window",
        3,
        Position(0, 0),
        {
            "name": "running",
            "operation": "cumulative_sum",
            "column_id": "amount",
            "partitions": ["group"],
            "order_by": [{"column_id": "order"}],
        },
    )
    executor = get_node_registry().get("window", 3).executor
    context = ExecutionContext(uuid4(), uuid4(), uuid4())
    elapsed = []
    for _ in range(2):
        start = time.perf_counter()
        result = executor.execute(node, {"input": source}, context)
        elapsed.append(round(time.perf_counter() - start, 3))
        assert result.row_count == count
        assert result.frame["running"][-1] == Decimal("9007199254740993110.00")
    tracemalloc.start()
    executor.execute(node, {"input": source}, context)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "rows": count,
        "columns": width,
        "cold_seconds": elapsed[0],
        "repeat_seconds": elapsed[1],
        "python_peak_mib": round(peak / 1024**2, 2),
        "output_polars_mib": round(result.frame.estimated_size() / 1024**2, 2),
        "note": (
            "Repeat is not cached; traced memory excludes native allocations "
            "and source construction."
        ),
    }


if __name__ == "__main__":
    print(json.dumps([run(3), run(100)], indent=2))
