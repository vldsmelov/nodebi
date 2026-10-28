"""Non-persistent 100k-row bubble preparation benchmark; no database or file writes."""

import json
import time
import tracemalloc
from uuid import uuid4

import polars as pl

from app.domain.bubble import BubbleSpec
from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, polars_to_logical
from app.services.bubble_preparation import prepare_bubble


def run(width: int) -> dict[str, object]:
    size = 100_000
    frame = pl.DataFrame(
        {
            "key": range(size),
            "x": pl.Series(range(size)).cast(pl.Decimal(38, 2)),
            "y": pl.Series(range(size)).cast(pl.Decimal(38, 2)),
            "size": pl.Series(range(size)).cast(pl.Decimal(38, 2)),
            **{f"unused_{i}": [i] * size for i in range(width - 4)},
        }
    )
    dataset = Dataset(
        frame,
        DatasetSchema(
            tuple(
                ColumnSchema(name, name, name, polars_to_logical(dtype), False)
                for name, dtype in frame.schema.items()
            )
        ),
    )
    spec = BubbleSpec(key_column_id="key", x_column_id="x", y_column_id="y", size_column_id="size")
    namespace = uuid4()
    durations = []
    for _ in range(2):
        started = time.perf_counter()
        result = prepare_bubble(dataset, spec, namespace)
        durations.append(round(time.perf_counter() - started, 3))
        assert result.presentation.visible_count == size - 1
        assert result.presentation.x_axis.maximum == "99999"
        assert len(result.observations.rows) == 1000
        assert len(result.observations.columns) == 4
    tracemalloc.start()
    prepare_bubble(dataset, spec, namespace)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "rows": size,
        "input_columns": width,
        "transport_rows": len(result.observations.rows),
        "transport_columns": len(result.observations.columns),
        "cold_seconds": durations[0],
        "repeat_seconds": durations[1],
        "python_peak_mib": round(peak / 1024**2, 2),
        "input_polars_mib": round(frame.estimated_size() / 1024**2, 2),
        "note": (
            "Construction excluded. Repeat is not cached. Python peak excludes native allocations."
        ),
    }


if __name__ == "__main__":
    print(json.dumps([run(4), run(100)], indent=2))
