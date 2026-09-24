import uuid
from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path
from typing import BinaryIO

from app.config import get_settings


class StorageError(Exception):
    """Base error for storage operations."""


class InvalidStorageKeyError(StorageError):
    """Raised when a key attempts to escape the storage root."""


class StorageProvider(ABC):
    def reserve_key(self, *, suffix: str = "") -> str:
        """Allocate a key without writing; permits durable intent before artifact creation."""
        safe = suffix.lower() if suffix.startswith(".") and suffix[1:].isalnum() else ""
        return f"{uuid.uuid4().hex[:2]}/{uuid.uuid4().hex}{safe}"

    def save_reserved(self, key: str, content: BinaryIO) -> None:
        raise StorageError("This storage provider does not support recoverable report artifacts.")

    @abstractmethod
    def save(self, content: BinaryIO, *, suffix: str = "") -> str: ...

    @abstractmethod
    def open(self, key: str) -> BinaryIO: ...

    @abstractmethod
    def exists(self, key: str) -> bool: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...


class LocalStorageProvider(StorageProvider):
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve_key(self, key: str) -> Path:
        candidate = (self.root / key).resolve()
        if candidate == self.root or self.root not in candidate.parents:
            raise InvalidStorageKeyError("Storage key must remain inside the configured root.")
        return candidate

    def save(self, content: BinaryIO, *, suffix: str = "") -> str:
        key = self.reserve_key(suffix=suffix)
        self.save_reserved(key, content)
        return key

    def save_reserved(self, key: str, content: BinaryIO) -> None:
        destination = self._resolve_key(key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            with destination.open("xb") as target:
                while chunk := content.read(1024 * 1024):
                    target.write(chunk)
        except Exception:
            destination.unlink(missing_ok=True)
            raise

    def open(self, key: str) -> BinaryIO:
        return self._resolve_key(key).open("rb")

    def exists(self, key: str) -> bool:
        return self._resolve_key(key).is_file()

    def delete(self, key: str) -> None:
        path = self._resolve_key(key)
        if path.exists():
            path.unlink()


@lru_cache
def get_storage_provider() -> StorageProvider:
    return LocalStorageProvider(get_settings().storage_root)
