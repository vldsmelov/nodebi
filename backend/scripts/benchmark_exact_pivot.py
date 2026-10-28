"""Nonpersistent 100k-row exact Pivot benchmark, independent narrow/wide source fixtures."""

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
            "index": [i % 100 for i in range(count)],
            "category": [(i // 100) % 10 for i in range(count)],
            **{f"extra_{i}": [i] * count for i in range(width - 3)},
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
                    LogicalType.DECIMAL if name == "amount" else LogicalType.INTEGER,
                    False,
                    {"precision": 38, "scale": 2} if name == "amount" else {},
                )
                for name in frame.columns
            )
        ),
    )
    node = NodeInstance(
        uuid4(),
        "pivot",
        2,
        Position(0, 0),
        {
            "index_column_id": "index",
            "pivot_column_id": "category",
            "value_column_id": "amount",
            "operation": "sum",
        },
    )
    executor = get_node_registry().get("pivot", 2).executor
    context = ExecutionContext(uuid4(), uuid4(), uuid4())
    durations = []
    for _ in range(2):
        start = time.perf_counter()
        result = executor.execute(node, {"input": source}, context)
        durations.append(round(time.perf_counter() - start, 3))
        assert result.frame.shape == (100, 11)
        for field in result.schema.columns[1:]:
            assert result.frame[field.engine_name].unique().to_list() == [
                Decimal("900719925474099311.00")
            ]
    tracemalloc.start()
    executor.execute(node, {"input": source}, context)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "rows": count,
        "columns": width,
        "cold_seconds": durations[0],
        "repeat_seconds": durations[1],
        "python_peak_mib": round(peak / 1024**2, 2),
        "output_polars_mib": round(result.frame.estimated_size() / 1024**2, 3),
        "note": (
            "Source building/native memory excluded; repeat recomputes. "
            "Wide engine test bypasses import limits."
        ),
    }


if __name__ == "__main__":
    print(json.dumps([run(3), run(100)], indent=2))
