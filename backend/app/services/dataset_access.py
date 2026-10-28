import uuid

import polars as pl
from sqlalchemy import select

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.infrastructure.excel import ExcelWorkbookError
from app.models import DatasetSnapshot, DataSource
from app.services.source_access import ProjectSourceAccess


class ProjectDatasetAccess:
    """Shares the same source pointer snapshot as legacy sources and report releases."""

    def __init__(self, sources: ProjectSourceAccess) -> None:
        self.sources = sources

    def _snapshot(self, source_id: uuid.UUID, resource_id: str) -> DatasetSnapshot:
        try:
            source = self.sources._source(source_id)
        except ExcelWorkbookError as exc:
            raise NodeExecutionError(str(exc)) from exc
        key = source.source_metadata.get("active_snapshots", {}).get(resource_id)
        if not key:
            raise NodeExecutionError("The prepared dataset is unavailable. Check the import.")
        row = self.sources.session.scalar(
            select(DatasetSnapshot)
            .join(DataSource)
            .where(
                DatasetSnapshot.id == uuid.UUID(key),
                DatasetSnapshot.source_id == source_id,
                DataSource.project_id == self.sources.project_id,
            )
        )
        if row is None or not self.sources.storage.exists(row.storage_key):
            raise NodeExecutionError("The prepared dataset is unavailable. Check the import.")
        return row

    def identity(self, source_id: uuid.UUID, resource_id: str) -> str:
        row = self._snapshot(source_id, resource_id)
        return f"dataset-v1:{self.sources.project_id}:{row.id}:{row.storage_key}"

    def schema(self, source_id: uuid.UUID, resource_id: str) -> DatasetSchema:
        row = self._snapshot(source_id, resource_id)
        return DatasetSchema(
            tuple(
                ColumnSchema(**{**c, "logical_type": LogicalType(c["logical_type"])})
                for c in row.dataset_schema["columns"]
            )
        )

    def load(self, source_id: uuid.UUID, resource_id: str) -> Dataset:
        row = self._snapshot(source_id, resource_id)
        identity = self.identity(source_id, resource_id)

        def read() -> Dataset:
            with self.sources.storage.open(row.storage_key) as file:
                frame = pl.read_parquet(file)
            return Dataset(
                frame,
                self.schema(source_id, resource_id),
                {
                    "snapshot_id": str(row.id),
                    "source_id": str(source_id),
                    "resource_id": resource_id,
                    "exact_transport": True,
                },
            )

        return self.sources.cache.get_or_load(identity, read) if self.sources.cache else read()
