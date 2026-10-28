"""Typed, revisioned import drafts; never part of the active source fingerprint."""

import uuid

from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.domain.ingestion import ImportProfile
from app.models import DataSource, ReportDocument
from app.schemas.ingestion import ImportDraftRead, ImportDraftSettings, SaveImportDraft
from app.services.projects import ProjectService


def draft_id(source_id: uuid.UUID) -> uuid.UUID:
    return uuid.uuid5(source_id, "initial-import-draft-v1")


class ImportDraftService:
    def __init__(self, session: Session):
        self.session = session

    def document(self, source: DataSource) -> ReportDocument | None:
        row = self.session.get(ReportDocument, draft_id(source.id), populate_existing=True)
        if row is not None and (row.kind != "import_draft" or row.project_id != source.project_id):
            raise ApplicationError(
                "IMPORT_CONFLICT", "The import draft identity is unavailable.", 409
            )
        return row

    def read(self, source: DataSource) -> ImportDraftRead:
        row = self.document(source)
        if row is not None:
            return ImportDraftRead.model_validate(row.payload)
        resources = source.source_metadata["resources"]
        if not resources:
            raise ApplicationError("EMPTY_RESOURCE", "The source contains no tables.")
        return ImportDraftRead(
            revision=0,
            source_revision=source.source_metadata["revision"],
            resource_id=resources[0]["id"],
            options=source.source_metadata.get("read_options", {}),
            request_id=uuid.uuid5(draft_id(source.id), "revision:0"),
        )

    def save(self, source: DataSource, request: SaveImportDraft) -> ImportDraftRead:
        ProjectService(self.session).lock(source.project_id)
        self.session.refresh(source)
        if request.source_revision != source.source_metadata["revision"]:
            raise ApplicationError(
                "IMPORT_CONFLICT", "The source changed. Reload it before applying the import.", 409
            )
        if request.resource_id not in {r["id"] for r in source.source_metadata["resources"]}:
            raise ApplicationError("INVALID_IMPORT", "Choose a table from this source.")
        row = self.document(source)
        previous = self.read(source)
        settings = ImportDraftSettings.model_validate(
            request.model_dump(exclude={"expected_revision"})
        )
        old_settings = ImportDraftSettings.model_validate(
            previous.model_dump(include=set(ImportDraftSettings.model_fields))
        )
        if (
            row
            and row.status == "draft"
            and settings == old_settings
            and previous.revision in {request.expected_revision, request.expected_revision + 1}
        ):
            return previous
        if previous.revision != request.expected_revision:
            raise ApplicationError(
                "IMPORT_DRAFT_CONFLICT",
                "The import draft changed in another tab. "
                "Reload the saved draft before replacing it.",
                409,
            )
        revision = previous.revision + 1
        saved = ImportDraftRead(
            **settings.model_dump(),
            revision=revision,
            request_id=uuid.uuid5(draft_id(source.id), f"revision:{revision}"),
        )
        if row is None:
            row = ReportDocument(
                id=draft_id(source.id), project_id=source.project_id, kind="import_draft"
            )
            self.session.add(row)
        row.revision, row.status, row.payload = revision, "draft", saved.model_dump(mode="json")
        self.session.commit()
        return saved

    def validate_apply(
        self, source: DataSource, revision: int, request_id: uuid.UUID, profile: ImportProfile
    ) -> ReportDocument:
        row = self.document(source)
        saved = self.read(source)
        if (
            row is None
            or row.status != "draft"
            or saved.revision != revision
            or saved.request_id != request_id
            or saved.profile != profile
            or saved.source_revision != source.source_metadata["revision"]
        ):
            raise ApplicationError(
                "IMPORT_DRAFT_CONFLICT",
                "The import draft changed in another tab. "
                "Reload the saved draft before replacing it.",
                409,
            )
        return row

    @staticmethod
    def complete(row: ReportDocument, snapshot_id: uuid.UUID) -> None:
        saved = ImportDraftRead.model_validate(row.payload)
        row.status = "applied"
        row.revision += 1
        row.payload = saved.model_copy(
            update={"status": "applied", "revision": row.revision, "snapshot_id": snapshot_id}
        ).model_dump(mode="json")
