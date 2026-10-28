"""Deterministic, non-persistent normalization benchmark; reports measurements, not targets."""

import json
import time
import tracemalloc
from decimal import Decimal

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.ingestion import ImportField, ImportProfile
from app.services.normalization import normalize


def run(rows: int, width: int, *, trace_memory: bool = True) -> dict[str, object]:
    names = [f"field_{index}" for index in range(width)]
    frame = pl.DataFrame({name: ["1234.56"] * rows for name in names})
    source = Dataset(
        frame,
        DatasetSchema(
            tuple(ColumnSchema(name, name, name, LogicalType.STRING, False) for name in names)
        ),
    )
    profile = ImportProfile(
        resource_id="table",
        name="Benchmark",
        fields=[
            ImportField(
                field_id=name,
                source_field=name,
                name=name,
                logical_type=LogicalType.DECIMAL,
                nullable=False,
            )
            for name in names
        ],
    )
    durations = []
    for _ in range(2):
        start = time.perf_counter()
        result, preview = normalize(source, profile)
        durations.append(round(time.perf_counter() - start, 3))
        assert preview.can_apply and result.row_count == rows
        assert all(column.logical_type == LogicalType.DECIMAL for column in result.schema.columns)
        assert all(result.frame.select((pl.all() == Decimal("1234.56")).all()).row(0))
    # Tracing substantially changes Python/Decimal timings. Measure memory separately.
    peak = None
    if trace_memory:
        tracemalloc.start()
        normalize(source, profile)
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
    return {
        "rows": rows,
        "columns": width,
        "cold_seconds": durations[0],
        "repeat_seconds": durations[1],
        "python_peak_mib": round(peak / 1024**2, 2) if peak is not None else None,
        "output_polars_mib": round(result.frame.estimated_size() / 1024**2, 2),
        "note": (
            "Python memory tracing is optional and excludes native Polars allocations; "
            "repeat is not a cache hit. Timings exclude source construction."
        ),
    }


if __name__ == "__main__":
    print(json.dumps([run(100000, 3), run(1000, 100)], indent=2))
