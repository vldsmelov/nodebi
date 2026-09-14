import hashlib
import uuid

from sqlalchemy.orm import Session

from app.domain.datasets import Dataset, DatasetSchema
from app.domain.nodes import ExecutionCache
from app.domain.workbooks import DEFAULT_WORKSHEET_LAYOUT, WorksheetLayout
from app.infrastructure.excel import ExcelWorkbookError, OpenPyxlWorkbookReader
from app.infrastructure.storage import StorageProvider
from app.models import DataSource


class ProjectSourceAccess:
    """Validates ownership/artifacts even on cache hits; caches immutable sheets."""

    def __init__(
        self,
        project_id: uuid.UUID,
        session: Session,
        storage: StorageProvider,
        cache: ExecutionCache | None = None,
    ) -> None:
        self.project_id = project_id
        self.session = session
        self.storage = storage
        self.cache = cache
        self.reader = OpenPyxlWorkbookReader(storage)
        self._loaded: dict[str, Dataset] = {}

    def _source(self, source_id: uuid.UUID) -> DataSource:
        source = self.session.get(DataSource, source_id)
        if source is None or source.project_id != self.project_id:
            raise ExcelWorkbookError("The configured source does not exist in this project.")
        if not self.storage.exists(source.storage_key):
            raise ExcelWorkbookError("The source file is missing. Upload the workbook again.")
        return source

    def validate(self, source_id: uuid.UUID, sheet_name: str) -> None:
        source = self._source(source_id)
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
            f"source-v3:{self.project_id}:{source.id}:{source.storage_key}:{sheet_name}:{layout}"
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
                return (
                    self.reader.load_sheet(source.storage_key, sheet_name)
                    if layout == WorksheetLayout()
                    else self.reader.load_sheet(source.storage_key, sheet_name, layout)
                )

            loaded = self.cache.get_or_load(key, materialize) if self.cache else materialize()
        self._loaded[key] = loaded
        return loaded

    def schema(
        self,
        source_id: uuid.UUID,
        sheet_name: str,
        layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT,
    ) -> DatasetSchema:
        return self.load(source_id, sheet_name, layout).schema
