"""Non-persistent narrow/wide 100k-row exact Pareto benchmark; no database/files."""

import json
import time
import tracemalloc
from decimal import Decimal
from uuid import uuid4

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue
from app.domain.workflows import NodeInstance, Position
from app.nodes.pareto import ParetoExecutor


def run(width: int) -> dict[str, object]:
    size = 100_000
    frame = pl.DataFrame(
        {
            "key": [f"K{i:06}" for i in reversed(range(size))],
            "amount": pl.Series([Decimal("1.25")] * size, dtype=pl.Decimal(38, 2)),
            **{f"unused_{i}": [i] * size for i in range(width - 2)},
        }
    )
    schema = DatasetSchema(
        tuple(
            ColumnSchema(
                name,
                name,
                name,
                LogicalType.STRING
                if name == "key"
                else LogicalType.DECIMAL
                if name == "amount"
                else LogicalType.INTEGER,
                False,
                {"precision": 38, "scale": 2} if name == "amount" else {},
            )
            for name in frame.columns
        )
    )
    context = ExecutionContext(uuid4(), uuid4(), uuid4())
    node = NodeInstance(
        uuid4(),
        "pareto",
        1,
        Position(0, 0),
        {"category_column_id": "key", "value_column_id": "amount"},
    )
    inputs = {
        "input": TableValue(
            RowContext(context.workflow_id, uuid4(), "dataset"), Dataset(frame, schema)
        )
    }
    executor = ParetoExecutor()
    durations = []
    for _ in range(2):
        started = time.perf_counter()
        outputs = executor.execute_outputs(node, inputs, context)
        durations.append(round(time.perf_counter() - started, 3))
        ranked, summary = outputs["dataset"].dataset, outputs["summary"].dataset
        assert ranked.row_count == size
        assert ranked.frame["category"][0] == "K000000"
        assert ranked.frame["cumulative_percent"][-1] == Decimal("100")
        assert ranked.frame["share_exact"][0] == "0.00001"
        assert summary.frame["total_value"][0] == Decimal("125000.00")
    tracemalloc.start()
    executor.execute_outputs(node, inputs, context)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "rows": size,
        "input_columns": width,
        "output_rows": ranked.row_count,
        "cold_seconds": durations[0],
        "repeat_seconds": durations[1],
        "python_peak_mib": round(peak / 1024**2, 2),
        "output_polars_mib": round(ranked.frame.estimated_size() / 1024**2, 3),
        "note": "Construction excluded. Repeat is not cached. Memory excludes native allocations.",
    }


if __name__ == "__main__":
    for width in (2, 100):
        print(json.dumps(run(width)), flush=True)
