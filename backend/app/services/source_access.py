import hashlib
import json
import uuid
from copy import deepcopy
from dataclasses import dataclass
from typing import Any

import polars as pl
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionCache
from app.domain.workbooks import DEFAULT_WORKSHEET_LAYOUT, WorksheetLayout
from app.infrastructure.excel import ExcelWorkbookError, OpenPyxlWorkbookReader
from app.infrastructure.storage import StorageProvider
from app.models import DataSource


@dataclass(frozen=True)
class SourceSnapshot:
    id: uuid.UUID
    storage_key: str
    source_metadata: dict[str, Any]


def profile_key(sheet_name: str, layout: WorksheetLayout) -> str:
    return f"{sheet_name}:{layout}"


class ProjectSourceAccess:
    """Validates ownership/artifacts even on cache hits; caches immutable sheets."""

    def __init__(
        self,
        project_id: uuid.UUID,
        session: Session,
        storage: StorageProvider,
        cache: ExecutionCache | None = None,
        overrides: dict[uuid.UUID, SourceSnapshot] | None = None,
    ) -> None:
        self.project_id = project_id
        self.session = session
        self.storage = storage
        self.cache = cache
        self.reader = OpenPyxlWorkbookReader(storage)
        self._loaded: dict[str, Dataset] = {}
        # One SQL statement pins the entire source set before execution starts.
        self.snapshots = {
            row.id: SourceSnapshot(row.id, row.storage_key, deepcopy(row.source_metadata))
            for row in session.execute(
                select(DataSource.id, DataSource.storage_key, DataSource.source_metadata).where(
                    DataSource.project_id == project_id
                )
            )
        }
        if overrides:
            if not set(overrides).issubset(self.snapshots):
                raise ExcelWorkbookError("The configured source does not exist in this project.")
            self.snapshots.update(overrides)

    def _source(self, source_id: uuid.UUID) -> SourceSnapshot:
        source = self.snapshots.get(source_id)
        exists = self.session.scalar(
            select(DataSource.id).where(
                DataSource.id == source_id, DataSource.project_id == self.project_id
            )
        )
        if source is None or exists is None:
            raise ExcelWorkbookError("The configured source does not exist in this project.")
        keys = [
            source.storage_key,
            *[item["storage_key"] for item in source.source_metadata.get("periods", [])],
        ]
        if any(not self.storage.exists(key) for key in keys):
            raise ExcelWorkbookError("The source file is missing. Upload the workbook again.")
        return source

    def validate(self, source_id: uuid.UUID, sheet_name: str) -> None:
        source = self._source(source_id)
        if any(
            key.startswith(f"{sheet_name}:") for key in source.source_metadata.get("bindings", {})
        ):
            return
        sheets = source.source_metadata.get("workbook", {}).get("sheets", [])
        if not sheets:
            names = {sheet.name for sheet in self.reader.inspect(source.storage_key).sheets}
        else:
            names = {sheet["name"] for sheet in sheets}
        if sheet_name not in names:
            raise ExcelWorkbookError("Configured worksheet does not exist.")

    def identity(
        self,
        source_id: uuid.UUID,
        sheet_name: str,
        layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT,
    ) -> str:
        source = self._source(source_id)
        identity = (
            f"source-v4:{self.project_id}:{source.id}:{source.storage_key}:{sheet_name}:{layout}:"
            f"{json.dumps(source.source_metadata, sort_keys=True)}"
        )
        return hashlib.sha256(identity.encode()).hexdigest()

    def load(
        self,
        source_id: uuid.UUID,
        sheet_name: str,
        layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT,
    ) -> Dataset:
        self.validate(source_id, sheet_name)
        key = self.identity(source_id, sheet_name, layout)
        loaded = self._loaded.get(key)
        if loaded is None:
            source = self._source(source_id)

            def materialize() -> Dataset:
                # Recheck availability after waiting for another cold load.
                self.validate(source_id, sheet_name)
                periods = source.source_metadata.get("periods", [])
                if not periods:
                    return self._materialize(
                        source.storage_key, source.source_metadata, sheet_name, layout
                    )
                from app.nodes.combine import union_datasets

                result = None
                for member in periods:
                    table = self._materialize(
                        member["storage_key"], member["metadata"], sheet_name, layout
                    )
                    result = table if result is None else union_datasets(result, table)
                assert result is not None
                return result

            loaded = self.cache.get_or_load(key, materialize) if self.cache else materialize()
        self._loaded[key] = loaded
        return loaded

    def _materialize(
        self, storage_key: str, metadata: dict[str, Any], sheet_name: str, layout: WorksheetLayout
    ) -> Dataset:
        binding = metadata.get("bindings", {}).get(profile_key(sheet_name, layout))
        actual_sheet = binding["sheet_name"] if binding else sheet_name
        dataset = (
            self.reader.load_sheet(storage_key, actual_sheet)
            if layout == WorksheetLayout()
            else self.reader.load_sheet(storage_key, actual_sheet, layout)
        )
        if not binding:
            return dataset
        columns = []
        expressions = []
        for item in binding["columns"]:
            original = item["column"]
            actual = dataset.schema.by_id(item["physical_id"])
            columns.append(
                ColumnSchema(**{**original, "logical_type": LogicalType(original["logical_type"])})
            )
            expression = pl.col(actual.engine_name)
            if actual.logical_type == LogicalType.UNKNOWN:
                from app.domain.datasets import logical_to_polars

                expression = expression.cast(
                    logical_to_polars(LogicalType(original["logical_type"]))
                )
            expressions.append(expression.alias(original["engine_name"]))
        return Dataset(
            dataset.frame.select(expressions),
            DatasetSchema(tuple(columns)),
            dataset.metadata,
        )

    def schema(
        self,
        source_id: uuid.UUID,
        sheet_name: str,
        layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT,
    ) -> DatasetSchema:
        return self.load(source_id, sheet_name, layout).schema
