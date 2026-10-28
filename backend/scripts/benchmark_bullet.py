"""Non-persistent full-validation bullet benchmark; no database or file writes."""

import json
import time
import tracemalloc
from uuid import uuid4

import polars as pl

from app.domain.bullet import BulletBand, BulletSpec
from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, polars_to_logical
from app.services.bullet_preparation import prepare_bullet


def run(width: int) -> dict[str, object]:
    size = 100_000
    frame = pl.DataFrame(
        {
            "key": range(size),
            "actual": pl.Series([40] * size).cast(pl.Decimal(38, 2)),
            "target": pl.Series([80] * size).cast(pl.Decimal(38, 2)),
            **{f"unused_{i}": [i] * size for i in range(width - 3)},
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
    spec = BulletSpec(
        category_column_id="key",
        actual_column_id="actual",
        target_column_id="target",
        maximum="100",
        bands=[BulletBand(label="Range", upper="100")],
    )
    namespace = uuid4()
    durations = []
    for _ in range(2):
        started = time.perf_counter()
        result = prepare_bullet(dataset, spec, namespace, limit=100)
        durations.append(round(time.perf_counter() - started, 3))
        assert result.presentation.input_count == size
        assert result.presentation.missing_actual_count == 0
        assert len(result.observations.rows) == 100
        assert len(result.observations.columns) == 3
    tracemalloc.start()
    prepare_bullet(dataset, spec, namespace)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "rows": size,
        "input_columns": width,
        "transport_rows": len(result.observations.rows),
        "transport_columns": 3,
        "cold_seconds": durations[0],
        "repeat_seconds": durations[1],
        "python_peak_mib": round(peak / 1024**2, 2),
        "input_polars_mib": round(frame.estimated_size() / 1024**2, 2),
        "note": (
            "Construction excluded. Repeat is not cached. Python peak excludes native allocations."
        ),
    }


if __name__ == "__main__":
    print(json.dumps([run(3), run(100)], indent=2))
