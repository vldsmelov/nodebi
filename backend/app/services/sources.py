import hashlib
import uuid
from dataclasses import asdict
from pathlib import PurePosixPath
from tempfile import SpooledTemporaryFile
from typing import BinaryIO, cast

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.workbooks import (
    DEFAULT_WORKSHEET_LAYOUT,
    WorksheetLayout,
    WorksheetLoadOptions,
    WorksheetPreview,
)
from app.infrastructure.excel import (
    ExcelWorkbookError,
    OpenPyxlWorkbookReader,
    WorksheetNotFoundError,
)
from app.infrastructure.storage import StorageProvider
from app.models import (
    DatasetSnapshot,
    DataSource,
    Project,
    ReportDocument,
    SourceVersion,
    Workflow,
    WorkflowNode,
)
from app.services.file_cleanup import drain_deletions, enqueue_deletion
from app.services.projects import ProjectService


class SourceService:
    def __init__(self, session: Session, storage: StorageProvider) -> None:
        self.session = session
        self.storage = storage

    def preview(
        self,
        source: DataSource,
        sheet_name: str,
        limit: int,
        layout: WorksheetLayout = DEFAULT_WORKSHEET_LAYOUT,
    ) -> WorksheetPreview:
        try:
            return OpenPyxlWorkbookReader(self.storage).preview_sheet(
                source.storage_key, sheet_name, WorksheetLoadOptions(limit=limit, layout=layout)
            )
        except WorksheetNotFoundError as exc:
            raise ApplicationError("WORKSHEET_NOT_FOUND", str(exc), 404) from exc
        except ExcelWorkbookError as exc:
            raise ApplicationError("INVALID_WORKBOOK", str(exc)) from exc

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
        digest = hashlib.sha256()
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
                digest.update(chunk)
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
            self.session.flush()
            self.session.add(
                SourceVersion(
                    source_id=source.id,
                    storage_key=key,
                    filename=source.original_filename,
                    file_size=total,
                    sha256=digest.hexdigest(),
                    workbook=asdict(workbook),
                )
            )
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
        ProjectService(self.session).lock(source.project_id)
        if self.session.scalar(select(DataSource.id).where(DataSource.id == source.id)) is None:
            raise ApplicationError("SOURCE_NOT_FOUND", "Data source does not exist.", 404)
        nodes = self.session.scalars(
            select(WorkflowNode).join(Workflow).where(Workflow.project_id == source.project_id)
        )
        if any(str(node.config.get("source_id")) == str(source.id) for node in nodes):
            raise ApplicationError(
                "SOURCE_IN_USE", "Remove this source from its workflow before deleting it.", 409
            )
        history = self.session.scalars(
            select(ReportDocument).where(
                ReportDocument.project_id == source.project_id,
                ReportDocument.kind.in_(["release", "update"]),
            )
        )
        if any(
            row.kind == "release"
            or any(item.get("source_id") == str(source.id) for item in row.payload.get("items", []))
            for row in history
        ):
            raise ApplicationError(
                "SOURCE_HISTORY_IN_USE",
                "This project has report history. Preserve its sources.",
                409,
            )
        for key in self.session.scalars(
            select(SourceVersion.storage_key).where(SourceVersion.source_id == source.id)
        ):
            enqueue_deletion(self.session, key)
        enqueue_deletion(self.session, source.storage_key)
        for key in self.session.scalars(
            select(DatasetSnapshot.storage_key).where(DatasetSnapshot.source_id == source.id)
        ):
            enqueue_deletion(self.session, key)
        from app.services.import_drafts import ImportDraftService

        draft = ImportDraftService(self.session).document(source)
        if draft is not None:
            self.session.delete(draft)
        self.session.delete(source)
        self.session.commit()
        drain_deletions(self.session, self.storage)

    def delete_project(self, project: Project) -> None:
        project = ProjectService(self.session).lock(project.id)
        for key in self.session.scalars(
            select(DatasetSnapshot.storage_key)
            .join(DataSource)
            .where(DataSource.project_id == project.id)
        ):
            enqueue_deletion(self.session, key)
        for key in self.session.scalars(
            select(SourceVersion.storage_key)
            .join(DataSource)
            .where(DataSource.project_id == project.id)
        ):
            enqueue_deletion(self.session, key)
        for document in self.session.scalars(
            select(ReportDocument).where(ReportDocument.project_id == project.id)
        ):
            for key in document.payload.get("artifact_keys", []):
                enqueue_deletion(self.session, key)
        for key in self.session.scalars(
            select(DataSource.storage_key).where(DataSource.project_id == project.id)
        ):
            enqueue_deletion(self.session, key)
        self.session.delete(project)
        self.session.commit()
        drain_deletions(self.session, self.storage)
