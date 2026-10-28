"""Non-persistent 100k-row exact hierarchical rollup benchmark; no database/files."""

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
from app.nodes.table_rollup import TableRollupExecutor


def run(width: int) -> dict[str, object]:
    size = 100_000
    frame = pl.DataFrame(
        {
            "region": [str(i % 10) for i in range(size)],
            "branch": [str(i % 100) for i in range(size)],
            "amount": pl.Series([Decimal("1.25")] * size, dtype=pl.Decimal(38, 2)),
            "quantity": [2] * size,
            **{f"unused_{i}": [i] * size for i in range(width - 4)},
        }
    )
    schema = DatasetSchema(
        tuple(
            ColumnSchema(
                name,
                name,
                name,
                LogicalType.STRING
                if name in {"region", "branch"}
                else LogicalType.DECIMAL
                if name == "amount"
                else LogicalType.INTEGER,
                False,
                {"precision": 38, "scale": 2} if name == "amount" else {},
            )
            for name in frame.columns
        )
    )
    source = Dataset(frame, schema)
    context = ExecutionContext(uuid4(), uuid4(), uuid4())
    node = NodeInstance(
        uuid4(),
        "table_rollup",
        1,
        Position(0, 0),
        {
            "dimensions": ["region", "branch"],
            "measures": [
                {
                    "output_id": str(uuid4()),
                    "name": operation,
                    "operation": operation,
                    "column_id": "amount",
                    **(
                        {"denominator_column_id": "quantity"}
                        if operation == "ratio_of_sums"
                        else {}
                    ),
                }
                for operation in ("sum", "average", "ratio_of_sums")
            ],
        },
    )
    executor = TableRollupExecutor()
    inputs = {"input": TableValue(RowContext(context.workflow_id, uuid4(), "dataset"), source)}
    durations = []
    for _ in range(2):
        started = time.perf_counter()
        result = executor.execute_outputs(node, inputs, context)["dataset"].dataset
        durations.append(round(time.perf_counter() - started, 3))
        assert result.row_count == 111
        assert result.frame.row(-1)[-3:] == (
            Decimal("125000.00"),
            Decimal("1.250000"),
            Decimal("0.625000"),
        )
    tracemalloc.start()
    executor.execute_outputs(node, inputs, context)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "rows": size,
        "input_columns": width,
        "output_rows": result.row_count,
        "cold_seconds": durations[0],
        "repeat_seconds": durations[1],
        "python_peak_mib": round(peak / 1024**2, 2),
        "output_polars_mib": round(result.frame.estimated_size() / 1024**2, 3),
        "note": "Construction excluded. Repeat is not cached. Memory excludes native allocations.",
    }


if __name__ == "__main__":
    print(json.dumps([run(4), run(100)], indent=2))
