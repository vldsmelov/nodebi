import hashlib
import uuid

from sqlalchemy.orm import Session

from app.domain.datasets import Dataset, DatasetSchema
from app.domain.nodes import ExecutionCache
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

    def identity(self, source_id: uuid.UUID, sheet_name: str) -> str:
        source = self._source(source_id)
        identity = f"source-v2:{self.project_id}:{source.id}:{source.storage_key}:{sheet_name}"
        return hashlib.sha256(identity.encode()).hexdigest()

    def load(self, source_id: uuid.UUID, sheet_name: str) -> Dataset:
        self.validate(source_id, sheet_name)
        key = self.identity(source_id, sheet_name)
        loaded = self._loaded.get(key)
        if loaded is None and self.cache:
            loaded = self.cache.get(key)
        if loaded is None:
            source = self._source(source_id)
            loaded = self.reader.load_sheet(source.storage_key, sheet_name)
            if self.cache:
                self.cache.put(key, loaded)
        self._loaded[key] = loaded
        return loaded

    def schema(self, source_id: uuid.UUID, sheet_name: str) -> DatasetSchema:
        return self.load(source_id, sheet_name).schema
