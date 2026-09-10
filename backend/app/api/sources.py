import uuid
from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.domain.workbooks import WorksheetLoadOptions
from app.infrastructure.database import get_session
from app.infrastructure.excel import (
    ExcelWorkbookError,
    OpenPyxlWorkbookReader,
    WorksheetNotFoundError,
)
from app.infrastructure.storage import StorageProvider, get_storage_provider
from app.models import DataSource, Project
from app.repositories.sqlalchemy import SqlAlchemySourceRepository
from app.schemas.sources import DataSourceList, DataSourceRead, WorksheetPreviewRead
from app.services.sources import SourceService

router = APIRouter(tags=["data sources"])
DatabaseSession = Annotated[Session, Depends(get_session)]
Storage = Annotated[StorageProvider, Depends(get_storage_provider)]
AppSettings = Annotated[Settings, Depends(get_settings)]
SUPPORTED_EXTENSIONS = {".xlsx", ".xlsm"}


def _source_read(source: DataSource) -> DataSourceRead:
    return DataSourceRead(
        id=source.id,
        project_id=source.project_id,
        type=source.type,
        name=source.name,
        original_filename=source.original_filename,
        file_size=source.file_size,
        status=source.status,
        workbook=source.source_metadata["workbook"],
        created_at=source.created_at,
        updated_at=source.updated_at,
    )


def _source_or_404(session: Session, source_id: uuid.UUID) -> DataSource:
    source = SqlAlchemySourceRepository(session).get(source_id)
    if source is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "SOURCE_NOT_FOUND", "message": "Data source does not exist."},
        )
    return source


@router.post(
    "/api/v1/projects/{project_id}/sources/excel",
    response_model=DataSourceRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_excel(
    project_id: uuid.UUID,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
    file: Annotated[UploadFile, File(description="Excel workbook")],
) -> DataSourceRead:
    source = SourceService(session, storage).upload(
        project_id, file.filename or "workbook", file.file, settings
    )
    return _source_read(source)


@router.get("/api/v1/projects/{project_id}/sources", response_model=DataSourceList)
def list_sources(project_id: uuid.UUID, session: DatabaseSession) -> DataSourceList:
    if session.get(Project, project_id) is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project does not exist."},
        )
    sources = SqlAlchemySourceRepository(session).list_for_project(project_id)
    return DataSourceList(items=[_source_read(source) for source in sources])


@router.get(
    "/api/v1/sources/{source_id}/sheets/{sheet_name}/preview", response_model=WorksheetPreviewRead
)
def preview_sheet(
    source_id: uuid.UUID,
    sheet_name: str,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
    limit: Annotated[int, Query(ge=1)] = 50,
) -> WorksheetPreviewRead:
    source = _source_or_404(session, source_id)
    bounded_limit = min(limit, settings.max_preview_rows)
    try:
        preview = OpenPyxlWorkbookReader(storage).preview_sheet(
            source.storage_key, sheet_name, WorksheetLoadOptions(limit=bounded_limit)
        )
    except WorksheetNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail={"code": "WORKSHEET_NOT_FOUND", "message": str(exc)}
        ) from exc
    except ExcelWorkbookError as exc:
        raise HTTPException(
            status_code=422, detail={"code": "INVALID_WORKBOOK", "message": str(exc)}
        ) from exc
    return WorksheetPreviewRead.model_validate(asdict(preview))


@router.delete("/api/v1/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(source_id: uuid.UUID, session: DatabaseSession, storage: Storage) -> Response:
    source = _source_or_404(session, source_id)
    SourceService(session, storage).delete(source)
    return Response(status_code=204)
