import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from sqlalchemy import select

from app.api.sources import AppSettings, DatabaseSession, Storage
from app.domain.errors import ApplicationError
from app.domain.ingestion import ConnectorDefinition, ImportPreview, ImportProfile, ReadOptions
from app.infrastructure.connectors import CONNECTORS
from app.models import DatasetSnapshot, DataSource
from app.schemas.ingestion import (
    ApplyImportRequest,
    DatasetSnapshotRead,
    ImportDraftRead,
    ImportedSourceRead,
    ImportSessionRead,
    InspectResourceRequest,
    SaveImportDraft,
)
from app.services.import_drafts import ImportDraftService
from app.services.ingestion import IngestionService
from app.services.projects import ProjectService

router = APIRouter(tags=["universal data"])


def project_source(
    project_id: uuid.UUID, source_id: uuid.UUID, session: DatabaseSession, storage: Storage
) -> DataSource:
    source = IngestionService(session, storage).source(source_id)
    if source.project_id != project_id:
        raise ApplicationError("SOURCE_NOT_FOUND", "Imported source does not exist.", 404)
    return source


@router.get(
    "/api/v1/projects/{project_id}/imports/{source_id}/session", response_model=ImportSessionRead
)
def import_session(
    project_id: uuid.UUID, source_id: uuid.UUID, session: DatabaseSession, storage: Storage
) -> ImportSessionRead:
    source = project_source(project_id, source_id, session, storage)
    return ImportSessionRead(
        source=IngestionService(session, storage).read(source),
        draft=ImportDraftService(session).read(source),
    )


@router.put(
    "/api/v1/projects/{project_id}/imports/{source_id}/draft", response_model=ImportDraftRead
)
def save_draft(
    project_id: uuid.UUID,
    source_id: uuid.UUID,
    payload: SaveImportDraft,
    session: DatabaseSession,
    storage: Storage,
) -> ImportDraftRead:
    return ImportDraftService(session).save(
        project_source(project_id, source_id, session, storage), payload
    )


@router.get("/api/v1/connectors", response_model=list[ConnectorDefinition])
def connectors() -> list[ConnectorDefinition]:
    return list(CONNECTORS)


@router.get("/api/v1/projects/{project_id}/imports", response_model=list[ImportedSourceRead])
def imports(
    project_id: uuid.UUID, session: DatabaseSession, storage: Storage
) -> list[ImportedSourceRead]:
    ProjectService(session).get(project_id)
    service = IngestionService(session, storage)
    return [
        service.read(s)
        for s in session.scalars(select(DataSource).where(DataSource.project_id == project_id))
        if "connector" in s.source_metadata
    ]


@router.post(
    "/api/v1/projects/{project_id}/imports", response_model=ImportedSourceRead, status_code=201
)
def upload(
    project_id: uuid.UUID,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
    file: Annotated[UploadFile, File()],
    connector: Annotated[str, Form()],
    encoding: Annotated[str, Form()] = "utf-8-sig",
    delimiter: Annotated[str, Form()] = ",",
    header_row: Annotated[int, Form(ge=1, le=250000)] = 1,
) -> ImportedSourceRead:
    from app.domain.errors import ApplicationError

    try:
        options = ReadOptions.model_validate(
            {"encoding": encoding, "delimiter": delimiter, "header_row": header_row}
        )
    except ValueError as exc:
        raise ApplicationError("INVALID_IMPORT_OPTIONS", "Check encoding and delimiter.") from exc
    return IngestionService(session, storage).upload(
        project_id, connector, file.filename or "data", file.file, options, settings
    )


@router.post("/api/v1/imports/{source_id}/inspect", response_model=ImportPreview)
def inspect(
    source_id: uuid.UUID,
    request: InspectResourceRequest,
    session: DatabaseSession,
    storage: Storage,
) -> ImportPreview:
    service = IngestionService(session, storage)
    return service.inspect(service.source(source_id), request.resource_id, request.options)


@router.post("/api/v1/imports/{source_id}/preview", response_model=ImportPreview)
def preview(
    source_id: uuid.UUID, profile: ImportProfile, session: DatabaseSession, storage: Storage
) -> ImportPreview:
    service = IngestionService(session, storage)
    return service.preview(service.source(source_id), profile)[1]


@router.post("/api/v1/imports/{source_id}/apply", response_model=DatasetSnapshotRead)
def apply(
    source_id: uuid.UUID, request: ApplyImportRequest, session: DatabaseSession, storage: Storage
) -> DatasetSnapshotRead:
    service = IngestionService(session, storage)
    return service.apply(service.source(source_id), request)


@router.get("/api/v1/projects/{project_id}/datasets", response_model=list[DatasetSnapshotRead])
def datasets(
    project_id: uuid.UUID, session: DatabaseSession, storage: Storage
) -> list[DatasetSnapshotRead]:
    ProjectService(session).get(project_id)
    sources = list(session.scalars(select(DataSource).where(DataSource.project_id == project_id)))
    active = [
        uuid.UUID(identity)
        for source in sources
        for identity in source.source_metadata.get("active_snapshots", {}).values()
    ]
    return [
        IngestionService.snapshot_read(row)
        for row in session.scalars(select(DatasetSnapshot).where(DatasetSnapshot.id.in_(active)))
    ]
