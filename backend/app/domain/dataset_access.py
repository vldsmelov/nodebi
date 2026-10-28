import uuid
from typing import Protocol

from app.domain.datasets import Dataset, DatasetSchema


class DatasetAccess(Protocol):
    def identity(self, source_id: uuid.UUID, resource_id: str) -> str: ...
    def schema(self, source_id: uuid.UUID, resource_id: str) -> DatasetSchema: ...
    def load(self, source_id: uuid.UUID, resource_id: str) -> Dataset: ...
