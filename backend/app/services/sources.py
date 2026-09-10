import uuid
from dataclasses import asdict
from pathlib import PurePosixPath
from tempfile import SpooledTemporaryFile
from typing import BinaryIO, cast

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.infrastructure.excel import ExcelWorkbookError, OpenPyxlWorkbookReader
from app.infrastructure.storage import StorageProvider
from app.models import DataSource, Project, Workflow, WorkflowNode
from app.services.file_cleanup import drain_deletions, enqueue_deletion


class SourceService:
    def __init__(self, session: Session, storage: StorageProvider) -> None:
        self.session = session
        self.storage = storage

    def upload(
        self, project_id: uuid.UUID, filename: str, content: BinaryIO, settings: Settings
    ) -> DataSource:
        if self.session.get(Project, project_id) is None:
            raise ApplicationError("PROJECT_NOT_FOUND", "Project does not exist.", 404)
        name = PurePosixPath(filename.replace("\\", "/")).name or "workbook"
        suffix = PurePosixPath(name).suffix.lower()
        if suffix not in {".xlsx", ".xlsm"}:
            raise ApplicationError(
                "UNSUPPORTED_FILE_TYPE", "Upload an .xlsx or .xlsm workbook.", 415
            )
        total = 0
        with SpooledTemporaryFile(
            max_size=min(settings.max_upload_bytes, 8 * 1024 * 1024)
        ) as buffer:
            while chunk := content.read(1024 * 1024):
                total += len(chunk)
                if total > settings.max_upload_bytes:
                    raise ApplicationError(
                        "UPLOAD_TOO_LARGE", "Workbook exceeds the upload limit.", 413
                    )
                buffer.write(chunk)
            buffer.seek(0)
            key = self.storage.save(cast(BinaryIO, buffer), suffix=suffix)
        try:
            workbook = OpenPyxlWorkbookReader(self.storage).inspect(key)
            source = DataSource(
                project_id=project_id,
                type="excel",
                name=PurePosixPath(name).stem[:200],
                original_filename=filename[:500],
                storage_key=key,
                file_size=total,
                status="ready",
                source_metadata={"workbook": asdict(workbook)},
            )
            self.session.add(source)
            self.session.commit()
        except Exception as exc:
            self.session.rollback()
            # A separate durable cleanup transaction handles unavailable storage too.
            enqueue_deletion(self.session, key)
            self.session.commit()
            drain_deletions(self.session, self.storage)
            if isinstance(exc, ExcelWorkbookError):
                raise ApplicationError("INVALID_WORKBOOK", str(exc)) from exc
            raise
        self.session.refresh(source)
        return source

    def delete(self, source: DataSource) -> None:
        nodes = self.session.scalars(
            select(WorkflowNode).join(Workflow).where(Workflow.project_id == source.project_id)
        )
        if any(str(node.config.get("source_id")) == str(source.id) for node in nodes):
            raise ApplicationError(
                "SOURCE_IN_USE", "Remove this source from its workflow before deleting it.", 409
            )
        enqueue_deletion(self.session, source.storage_key)
        self.session.delete(source)
        self.session.commit()
        drain_deletions(self.session, self.storage)

    def delete_project(self, project: Project) -> None:
        for key in self.session.scalars(
            select(DataSource.storage_key).where(DataSource.project_id == project.id)
        ):
            enqueue_deletion(self.session, key)
        self.session.delete(project)
        self.session.commit()
        drain_deletions(self.session, self.storage)
