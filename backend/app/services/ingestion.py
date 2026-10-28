"""Durable raw imports, strict previews and compare-and-swap snapshot publication."""

import hashlib
import io
import json
import uuid
from pathlib import PurePosixPath
from tempfile import SpooledTemporaryFile
from typing import BinaryIO, cast

import polars as pl
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.datasets import Dataset
from app.domain.errors import ApplicationError
from app.domain.ingestion import ImportPreview, ImportProfile, ReadOptions
from app.infrastructure.connectors import CONNECTORS, FileAdapter
from app.infrastructure.excel import ExcelWorkbookError
from app.infrastructure.storage import StorageProvider
from app.models import DatasetSnapshot, DataSource, SourceVersion, Workflow, WorkflowNode
from app.schemas.ingestion import ApplyImportRequest, DatasetSnapshotRead, ImportedSourceRead
from app.schemas.workflows import ResolvedColumnRead
from app.services.artifact_intents import adopt_artifact, discard_artifact, reserve_artifact
from app.services.import_drafts import ImportDraftService
from app.services.normalization import normalize, suggest_profile
from app.services.projects import ProjectService


class IngestionService:
    def __init__(self, session: Session, storage: StorageProvider) -> None:
        self.session, self.storage = session, storage

    def source(self, source_id: uuid.UUID) -> DataSource:
        source = self.session.get(DataSource, source_id)
        if source is None or "connector" not in source.source_metadata:
            raise ApplicationError("SOURCE_NOT_FOUND", "Imported source does not exist.", 404)
        return source

    def read(self, source: DataSource) -> ImportedSourceRead:
        metadata = source.source_metadata
        draft = ImportDraftService(self.session).document(source)
        return ImportedSourceRead(
            id=source.id,
            name=source.name,
            connector=metadata["connector"],
            resources=metadata["resources"],
            active_snapshots=metadata.get("active_snapshots", {}),
            revision=metadata.get("revision", 1),
            has_draft=draft.status == "draft" if draft else source.status == "draft",
            read_options=metadata.get("read_options", {}),
        )

    def upload(
        self,
        project_id: uuid.UUID,
        connector: str,
        filename: str,
        content: BinaryIO,
        options: ReadOptions,
        settings: Settings,
    ) -> ImportedSourceRead:
        ProjectService(self.session).get(project_id)
        definition = next(
            (d for d in CONNECTORS if d.type == connector and d.status == "available"), None
        )
        if definition is None:
            raise ApplicationError("CONNECTOR_UNAVAILABLE", "Choose Excel or CSV.")
        name = PurePosixPath(filename.replace("\\", "/")).name or "data"
        suffix = PurePosixPath(name).suffix.lower()
        if suffix not in definition.extensions:
            raise ApplicationError(
                "UNSUPPORTED_FILE_TYPE", "File type does not match the selected connector.", 415
            )
        total = 0
        digest = hashlib.sha256()
        with SpooledTemporaryFile(max_size=8 * 1024 * 1024) as buffer:
            while chunk := content.read(1024 * 1024):
                total += len(chunk)
                if total > settings.max_upload_bytes:
                    raise ApplicationError(
                        "UPLOAD_TOO_LARGE", "File exceeds the upload limit.", 413
                    )
                buffer.write(chunk)
                digest.update(chunk)
            buffer.seek(0)
            key, intent = reserve_artifact(self.session, self.storage, project_id, suffix)
            try:
                ProjectService(self.session).lock(project_id)
                self.storage.save_reserved(key, cast(BinaryIO, buffer))
            except Exception:
                discard_artifact(self.session, self.storage, key, intent)
                raise
        try:
            resources = FileAdapter(connector, self.storage).discover(key, options)
            source = DataSource(
                project_id=project_id,
                type=connector,
                name=PurePosixPath(name).stem[:200],
                original_filename=name[:500],
                storage_key=key,
                file_size=total,
                status="draft",
                source_metadata={
                    "connector": connector,
                    "resources": [r.model_dump() for r in resources],
                    "active_snapshots": {},
                    "revision": 1,
                    "read_options": options.model_dump(),
                },
            )
            self.session.add(source)
            self.session.flush()
            version = SourceVersion(
                source_id=source.id,
                storage_key=key,
                filename=source.original_filename,
                file_size=total,
                sha256=digest.hexdigest(),
                workbook={
                    "connector": connector,
                    "resources": [r.model_dump() for r in resources],
                    "read_options": options.model_dump(),
                },
            )
            self.session.add(version)
            self.session.flush()
            source.source_metadata = {
                **source.source_metadata,
                "source_version_id": str(version.id),
            }
            adopt_artifact(self.session, intent)
            self.session.commit()
        except Exception as exc:
            discard_artifact(self.session, self.storage, key, intent)
            if isinstance(exc, (ValueError, ExcelWorkbookError)):
                raise ApplicationError("INVALID_IMPORT", str(exc)) from exc
            raise
        return self.read(source)

    def raw(self, source: DataSource, resource_id: str, options: ReadOptions) -> Dataset:
        try:
            batches = list(
                FileAdapter(source.source_metadata["connector"], self.storage).read_batches(
                    source.storage_key, resource_id, options
                )
            )
            return Dataset(pl.concat([b.frame for b in batches]), batches[0].schema)
        except (ValueError, OSError, ExcelWorkbookError) as exc:
            raise ApplicationError("INVALID_IMPORT", str(exc)) from exc

    def inspect(self, source: DataSource, resource_id: str, options: ReadOptions) -> ImportPreview:
        data = self.raw(source, resource_id, options)
        if not data.schema.columns:
            raise ApplicationError("EMPTY_RESOURCE", "The selected table has no columns.")
        return normalize(data, suggest_profile(source.id, resource_id, source.name, options, data))[
            1
        ]

    def preview(self, source: DataSource, profile: ImportProfile) -> tuple[Dataset, ImportPreview]:
        try:
            return normalize(self.raw(source, profile.resource_id, profile.options), profile)
        except ValueError as exc:
            raise ApplicationError("INVALID_IMPORT", str(exc)) from exc

    def apply(self, source: DataSource, request: ApplyImportRequest) -> DatasetSnapshotRead:
        fingerprint_profile = request.profile.model_dump(mode="json")
        # Preserve pre-range idempotency receipts for unchanged whole-sheet profiles.
        if fingerprint_profile["options"].get("cell_range") is None:
            fingerprint_profile["options"].pop("cell_range", None)
        fingerprint = hashlib.sha256(
            json.dumps(fingerprint_profile, sort_keys=True).encode()
        ).hexdigest()
        existing_query = select(DatasetSnapshot).where(
            DatasetSnapshot.source_id == source.id,
            DatasetSnapshot.request_id == request.request_id,
        )
        existing = self.session.scalar(existing_query)
        if existing:
            if existing.request_hash != fingerprint:
                raise ApplicationError(
                    "IMPORT_CONFLICT",
                    "This request identity was used for different import settings.",
                    409,
                )
            return self.snapshot_read(existing)
        # Intent's FK must commit before acquiring the project lock in this session.
        key, intent = reserve_artifact(self.session, self.storage, source.project_id, ".parquet")
        try:
            ProjectService(self.session).lock(source.project_id)
            self.session.refresh(source)
            # Another request may have completed while we waited for the lock.
            existing = self.session.scalar(existing_query)
            if existing is not None:
                if existing.request_hash != fingerprint:
                    raise ApplicationError(
                        "IMPORT_CONFLICT",
                        "This request identity was used for different import settings.",
                        409,
                    )
                result = self.snapshot_read(existing)
                adopt_artifact(self.session, intent)
                self.session.commit()
                return result
            if source.source_metadata["revision"] != request.expected_revision:
                raise ApplicationError(
                    "IMPORT_CONFLICT",
                    "The source changed. Reload it before applying the import.",
                    409,
                )
            drafts = ImportDraftService(self.session)
            draft = (
                drafts.validate_apply(
                    source, request.draft_revision, request.request_id, request.profile
                )
                if request.draft_revision is not None
                else None
            )
            dataset, preview = self.preview(source, request.profile)
            if not preview.can_apply:
                raise ApplicationError(
                    "IMPORT_INVALID_VALUES",
                    "Correct conversion errors before applying the import.",
                    issues=[
                        {"code": i.code, "field": i.field_id, "message": i.message}
                        for i in preview.issues
                        if i.severity == "error"
                    ],
                )
            buffer = io.BytesIO()
            dataset.frame.write_parquet(buffer)
            buffer.seek(0)
            self.storage.save_reserved(key, buffer)
            row = DatasetSnapshot(
                source_id=source.id,
                source_version_id=uuid.UUID(source.source_metadata["source_version_id"]),
                resource_id=request.profile.resource_id,
                request_id=request.request_id,
                request_hash=fingerprint,
                storage_key=key,
                row_count=dataset.row_count,
                profile=request.profile.model_dump(mode="json"),
                dataset_schema=dataset.schema.to_dict(),
            )
            self.session.add(row)
            self.session.flush()
            source.source_metadata = {
                **source.source_metadata,
                "active_snapshots": {
                    **source.source_metadata.get("active_snapshots", {}),
                    row.resource_id: str(row.id),
                },
                "revision": request.expected_revision + 1,
            }
            source.status = "ready"
            referenced = {
                node.workflow_id
                for node in self.session.scalars(
                    select(WorkflowNode)
                    .join(Workflow)
                    .where(Workflow.project_id == source.project_id)
                )
                if node.node_type == "dataset_source"
                and node.config.get("source_id") == str(source.id)
                and node.config.get("resource_id") == row.resource_id
            }
            for workflow in self.session.scalars(
                select(Workflow).where(Workflow.id.in_(referenced))
            ):
                workflow.revision += 1
            if draft is not None:
                drafts.complete(draft, row.id)
            adopt_artifact(self.session, intent)
            result = self.snapshot_read(row)
            self.session.commit()
        except Exception:
            discard_artifact(self.session, self.storage, key, intent)
            raise
        return result

    @staticmethod
    def snapshot_read(row: DatasetSnapshot) -> DatasetSnapshotRead:
        return DatasetSnapshotRead(
            id=row.id,
            source_id=row.source_id,
            source_version_id=row.source_version_id,
            resource_id=row.resource_id,
            row_count=row.row_count,
            profile=ImportProfile.model_validate(row.profile),
            columns=[ResolvedColumnRead.model_validate(c) for c in row.dataset_schema["columns"]],
            created_at=row.created_at,
        )
