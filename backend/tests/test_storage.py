from io import BytesIO
from pathlib import Path

import pytest

from app.infrastructure.storage import InvalidStorageKeyError, LocalStorageProvider


def test_local_storage_round_trip(tmp_path: Path) -> None:
    storage = LocalStorageProvider(tmp_path)
    key = storage.save(BytesIO(b"workbook"), suffix=".XLSX")

    assert key.endswith(".xlsx")
    assert storage.exists(key)
    with storage.open(key) as stored:
        assert stored.read() == b"workbook"

    storage.delete(key)
    assert not storage.exists(key)


@pytest.mark.parametrize("key", ["../secret.xlsx", "..\\secret.xlsx", ".", ""])
def test_local_storage_rejects_unsafe_keys(tmp_path: Path, key: str) -> None:
    storage = LocalStorageProvider(tmp_path)

    with pytest.raises(InvalidStorageKeyError):
        storage.exists(key)


def test_local_storage_ignores_unsafe_suffix(tmp_path: Path) -> None:
    storage = LocalStorageProvider(tmp_path)

    key = storage.save(BytesIO(b"safe"), suffix="../../bad")

    assert key.split("/")[-1].isalnum()
