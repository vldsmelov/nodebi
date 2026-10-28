"""Kill a separate process, then recover using the production startup cleanup path."""

import io
import os
import subprocess
import sys
import uuid
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.infrastructure.database import Base
from app.infrastructure.storage import LocalStorageProvider
from app.models import DatasetSnapshot, DataSource, Project, ReportDocument
from app.schemas.ingestion import ApplyImportRequest
from app.services.file_cleanup import recover_staging_artifacts
from app.services.ingestion import IngestionService

WORKER = """
import io, os, sys, uuid
from pathlib import Path
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.config import Settings
from app.infrastructure.storage import LocalStorageProvider
from app.models import DataSource, ReportDocument
from app.schemas.ingestion import ApplyImportRequest
from app.domain.ingestion import ReadOptions
from app.services.ingestion import IngestionService

root, project, phase, request_id = sys.argv[1:]
root = Path(root)
engine = create_engine(f"sqlite:///{root / 'state.db'}")
storage = LocalStorageProvider(root / 'files')
settings = Settings(database_url='sqlite://', storage_root=root / 'files')
if phase in ('raw_write', 'snapshot_write'):
    original = storage.save_reserved
    def crash_write(key, content):
        original(key, content)
        os._exit(37)
    storage.save_reserved = crash_write
with Session(engine) as session:
    service = IngestionService(session, storage)
    if phase == 'raw_write':
        service.upload(uuid.UUID(project), 'csv', 'sales.csv',
                       io.BytesIO(b'amount\\n0.10\\n'), ReadOptions(), settings)
    else:
        source = session.scalar(select(DataSource))
        profile = service.inspect(source, 'table', ReadOptions()).profile
        if phase == 'after_commit':
            original_commit = session.commit
            def crash_commit():
                adopted = any(isinstance(row, ReportDocument) and row.kind == 'artifact'
                              for row in session.deleted)
                original_commit()
                if adopted:
                    os._exit(37)
            session.commit = crash_commit
        service.apply(source, ApplyImportRequest(profile=profile, expected_revision=1,
                                                request_id=uuid.UUID(request_id)))
raise RuntimeError('Crash hook was not reached')
"""


@pytest.mark.parametrize("phase", ["raw_write", "snapshot_write", "after_commit"])
def test_process_crash_preserves_only_adopted_import_artifacts(tmp_path: Path, phase: str) -> None:
    from app.domain.ingestion import ReadOptions

    engine = create_engine(f"sqlite:///{tmp_path / 'state.db'}")
    Base.metadata.create_all(engine)
    storage = LocalStorageProvider(tmp_path / "files")
    project, request_id = uuid.uuid4(), uuid.uuid4()
    with Session(engine) as session:
        session.add(Project(id=project, name="Crash acceptance"))
        session.commit()
        if phase != "raw_write":
            IngestionService(session, storage).upload(
                project,
                "csv",
                "sales.csv",
                io.BytesIO(b"amount\n0.10\n"),
                ReadOptions(),
                Settings(database_url="sqlite://", storage_root=tmp_path / "files"),
            )
    engine.dispose()
    result = subprocess.run(
        [sys.executable, "-c", WORKER, str(tmp_path), str(project), phase, str(request_id)],
        capture_output=True,
        text=True,
        timeout=30,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    assert result.returncode == 37, result.stdout + result.stderr
    # A fresh process/connection sees the separately committed intent, not uncommitted metadata.
    engine = create_engine(f"sqlite:///{tmp_path / 'state.db'}")
    try:
        with Session(engine) as session:
            intents = list(
                session.scalars(select(ReportDocument).where(ReportDocument.kind == "artifact"))
            )
            assert len(intents) == (0 if phase == "after_commit" else 1)
            assert recover_staging_artifacts(session, storage) == (
                0 if phase == "after_commit" else 1
            )
            sources = list(session.scalars(select(DataSource)))
            snapshots = list(session.scalars(select(DatasetSnapshot)))
            assert len(sources) == (0 if phase == "raw_write" else 1)
            assert len(snapshots) == (1 if phase == "after_commit" else 0)
            files = [p for p in (tmp_path / "files").rglob("*") if p.is_file()]
            assert len(files) == len(sources) + len(snapshots)
            if phase == "after_commit":
                source = sources[0]
                profile = IngestionService.snapshot_read(snapshots[0]).profile
                repeated = IngestionService(session, storage).apply(
                    source,
                    ApplyImportRequest(profile=profile, expected_revision=1, request_id=request_id),
                )
                assert repeated.id == snapshots[0].id
                assert storage.exists(snapshots[0].storage_key)
    finally:
        engine.dispose()
