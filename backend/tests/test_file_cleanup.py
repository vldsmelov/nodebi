from io import BytesIO
from pathlib import Path
from unittest.mock import patch

import pytest
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.infrastructure.storage import LocalStorageProvider
from app.models import DataSource, Project
from app.models.persistence import FileDeletion
from app.services.file_cleanup import drain_deletions
from app.services.sources import SourceService


def test_failed_file_deletion_can_be_retried_after_project_deletion(
    session: Session,
    tmp_path: Path,
) -> None:
    storage = LocalStorageProvider(tmp_path)
    key = storage.save(BytesIO(b"test"), suffix=".xlsx")
    project = Project(name="Delete me")
    session.add(project)
    session.flush()
    session.add(
        DataSource(
            project_id=project.id,
            type="excel",
            name="Book",
            original_filename="book.xlsx",
            storage_key=key,
            file_size=4,
            status="ready",
            source_metadata={},
        )
    )
    session.commit()
    project_id = project.id
    with patch.object(storage, "delete", side_effect=OSError("temporarily unavailable")):
        SourceService(session, storage).delete_project(project)
    assert session.get(Project, project_id) is None
    assert storage.exists(key)
    assert session.get(FileDeletion, key) is not None
    assert drain_deletions(session, storage) == 1
    assert not storage.exists(key)
    assert drain_deletions(session, storage) == 0


def test_upload_commit_failure_compensates_artifact(session: Session, tmp_path: Path) -> None:
    project = Project(name="Upload")
    session.add(project)
    session.commit()
    storage = LocalStorageProvider(tmp_path)
    workbook = Workbook()
    workbook.active.append(["value"])
    content = BytesIO()
    workbook.save(content)
    content.seek(0)
    real_commit = session.commit
    attempts = 0

    def fail_once() -> None:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("commit failed")
        real_commit()

    with patch.object(session, "commit", side_effect=fail_once), pytest.raises(RuntimeError):
        SourceService(session, storage).upload(project.id, "test.xlsx", content, Settings())
    assert list(tmp_path.rglob("*.xlsx")) == []
    assert session.scalars(select(DataSource)).all() == []
