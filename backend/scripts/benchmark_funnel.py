"""100k-row ordinary exact grouping -> funnel benchmark; no persistent writes."""

import json
import time
import tracemalloc
from uuid import uuid4

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, polars_to_logical
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue
from app.domain.workflows import NodeInstance, Position
from app.nodes.exact_group_by import ExactGroupByExecutor
from app.nodes.funnel import FunnelExecutor


def run(width: int) -> dict[str, object]:
    size = 100_000
    frame = pl.DataFrame(
        {
            "stage": [str(i % 50) for i in range(size)],
            "order": [i % 50 for i in range(size)],
            "amount": pl.Series([50 - i % 50 for i in range(size)]).cast(pl.Decimal(38, 2)),
            **{f"unused_{i}": [i] * size for i in range(width - 3)},
        }
    )
    schema = DatasetSchema(
        tuple(
            ColumnSchema(
                name,
                name,
                name,
                polars_to_logical(kind),
                False,
                {"scale": 2, "precision": 38} if name == "amount" else {},
            )
            for name, kind in frame.schema.items()
        )
    )
    source = Dataset(frame, schema)
    context = ExecutionContext(uuid4(), uuid4(), uuid4())
    group = NodeInstance(
        uuid4(),
        "group_by",
        2,
        Position(0, 0),
        {
            "dimensions": ["stage", "order"],
            "aggregations": [{"column_id": "amount", "name": "Amount", "operation": "sum"}],
        },
    )
    executor = ExactGroupByExecutor()
    value_id = executor.infer_schema(group, {"input": schema}, context).columns[-1].column_id
    funnel = NodeInstance(
        uuid4(),
        "funnel_steps",
        1,
        Position(0, 0),
        {
            "stage_column_id": "stage",
            "order_column_id": "order",
            "value_column_id": value_id,
        },
    )

    def calculate():
        prepared = executor.execute(group, {"input": source}, context)
        outputs = FunnelExecutor().execute_outputs(
            funnel,
            {"input": TableValue(RowContext(context.workflow_id, group.id, "dataset"), prepared)},
            context,
        )
        result = outputs["dataset"].dataset
        assert result.row_count == 50
        assert result.frame["value"][0] == 100_000 and result.frame["value"][-1] == 2000
        assert result.frame["initial_exact"][-1] == "0.02"
        return result

    durations = []
    for _ in range(2):
        started = time.perf_counter()
        result = calculate()
        durations.append(round(time.perf_counter() - started, 3))
    tracemalloc.start()
    calculate()
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "rows": size,
        "input_columns": width,
        "stages": result.row_count,
        "cold_seconds": durations[0],
        "repeat_seconds": durations[1],
        "python_peak_mib": round(peak / 1024**2, 2),
        "input_polars_mib": round(frame.estimated_size() / 1024**2, 2),
        "note": (
            "Construction/browser excluded. Repeat uncached. "
            "Python peak excludes native allocations."
        ),
    }


if __name__ == "__main__":
    print(json.dumps([run(3), run(100)], indent=2))
