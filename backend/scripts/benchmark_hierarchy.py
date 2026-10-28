"""Non-persistent 100k-row rollup plus complete hierarchy preparation benchmark."""

import json
import time
import tracemalloc
from decimal import Decimal
from uuid import uuid4

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.values import RowContext, TableValue
from app.domain.visualization_specs import AnalyticalRowRoles, HierarchySpec
from app.domain.workflows import NodeInstance, Position
from app.nodes.table_rollup import TableRollupExecutor
from app.services.hierarchy_visualizations import prepare_hierarchy


def run(width: int) -> dict[str, object]:
    size = 100_000
    frame = pl.DataFrame(
        {
            "region": [str(i % 10) for i in range(size)],
            "branch": [str(i % 1000) for i in range(size)],
            "amount": pl.Series([Decimal("1.25")] * size, dtype=pl.Decimal(38, 2)),
            **{f"unused_{i}": [i] * size for i in range(width - 3)},
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
    context = ExecutionContext(uuid4(), uuid4(), uuid4())
    measure_id = uuid4()
    node = NodeInstance(
        uuid4(),
        "table_rollup",
        1,
        Position(0, 0),
        {
            "dimensions": ["region", "branch"],
            "measures": [
                {
                    "output_id": str(measure_id),
                    "name": "Amount",
                    "operation": "sum",
                    "column_id": "amount",
                }
            ],
        },
    )
    prefix = f"roll_{node.id.hex}_"
    spec = HierarchySpec(
        type="treemap_chart",
        rows=AnalyticalRowRoles.model_validate(
            {name: prefix + name for name in AnalyticalRowRoles.model_fields}
        ),
        dimensions=[prefix + "dimension_region", prefix + "dimension_branch"],
        value_column_id=prefix + "measure_" + measure_id.hex,
    )
    inputs = {
        "input": TableValue(
            RowContext(context.workflow_id, uuid4(), "dataset"), Dataset(frame, schema)
        )
    }
    executor = TableRollupExecutor()

    def execute():
        dataset = executor.execute_outputs(node, inputs, context)["dataset"].dataset
        presentation = prepare_hierarchy(dataset, spec)
        assert presentation.total == "125000.00" and len(presentation.points) == 1011
        assert all(p.share_exact == "0.001" for p in presentation.points if p.depth == 2)
        return dataset, presentation

    durations = []
    for _ in range(2):
        started = time.perf_counter()
        dataset, presentation = execute()
        durations.append(round(time.perf_counter() - started, 3))
    tracemalloc.start()
    execute()
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "rows": size,
        "input_columns": width,
        "tree_nodes": len(presentation.points),
        "cold_seconds": durations[0],
        "repeat_seconds": durations[1],
        "python_peak_mib": round(peak / 1024**2, 2),
        "output_polars_mib": round(dataset.frame.estimated_size() / 1024**2, 3),
        "note": "Construction/native memory/browser latency excluded. Repeat uncached.",
    }


if __name__ == "__main__":
    for width in (3, 100):
        print(json.dumps(run(width)), flush=True)
