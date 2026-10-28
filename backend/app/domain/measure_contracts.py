"""Reusable measures preserve prepared values and fail if their declared grain changes."""

from app.domain.datasets import Dataset, DatasetSchema, LogicalType
from app.domain.visualizations import VisualizationConfig


def validate_measure_selection(config: VisualizationConfig, kind: str) -> None:
    fields = config.measure_column_ids
    if fields is None:
        return
    if (
        config.grain_column_ids is None
        or kind != "table"
        or len(set(fields)) != len(fields)
        or fields[0] != config.value_column_id
    ):
        raise ValueError(
            "Multiple reusable measures require a table with distinct fields and a declared grain."
        )
    if config.column_ids is not None and not set(fields) <= set(config.column_ids):
        raise ValueError("A measure table must display every selected measure.")


def validate_measure_schema(schema: DatasetSchema, value_id: str | None, grain: list[str]) -> None:
    if not value_id or schema.by_id(value_id).logical_type not in {
        LogicalType.INTEGER,
        LogicalType.FLOAT,
        LogicalType.DECIMAL,
    }:
        raise ValueError("A reusable measure requires a numeric result field.")
    if len(set(grain)) != len(grain) or value_id in grain:
        raise ValueError("Measure and grain fields must be distinct.")
    for identity in grain:
        schema.by_id(identity)


def validate_measure_grain(source: Dataset, grain: list[str]) -> None:
    names = [source.schema.by_id(identity).engine_name for identity in grain]
    duplicates = source.frame.select(names).is_duplicated().any() if names else source.row_count > 1
    if duplicates:
        raise ValueError(
            "Prepared values are not unique at the declared grain. "
            "Fix the calculation or grain; values were not aggregated."
        )
