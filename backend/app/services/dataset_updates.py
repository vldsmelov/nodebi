"""Universal source versions participate in the existing staged report cycle."""

import hashlib
import io
import json
import uuid
from collections import Counter
from collections.abc import Callable
from pathlib import PurePosixPath
from tempfile import SpooledTemporaryFile
from typing import BinaryIO, cast

import polars as pl
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.datasets import Dataset
from app.domain.errors import ApplicationError
from app.domain.ingestion import ImportProfile, ReadOptions
from app.infrastructure.connectors import FileAdapter
from app.infrastructure.excel import ExcelWorkbookError
from app.infrastructure.storage import StorageProvider
from app.models import DatasetSnapshot, DataSource, SourceVersion
from app.schemas.reporting import (
    CheckIssue,
    CheckResult,
    ColumnBinding,
    DatasetMappingProfile,
    UpdateItem,
)
from app.schemas.workflows import ResolvedColumnRead
from app.services.artifact_intents import adopt_artifact, discard_artifact, reserve_artifact
from app.services.normalization import normalize, transport_rows
from app.services.projects import ProjectService
from app.services.source_access import SourceSnapshot


class DatasetUpdateService:
    def __init__(self, session: Session, storage: StorageProvider):
        self.session, self.storage = session, storage

    def upload(
        self,
        source: DataSource,
        filename: str,
        content: BinaryIO,
        settings: Settings,
        options: ReadOptions | None,
    ) -> SourceVersion:
        adapter = FileAdapter(source.source_metadata["connector"], self.storage)
        name = PurePosixPath(filename.replace("\\", "/")).name or "data"
        suffix = PurePosixPath(name).suffix.lower()
        if suffix not in adapter.definition.extensions:
            raise ApplicationError(
                "UNSUPPORTED_FILE_TYPE", "File type does not match the selected connector.", 415
            )
        if options is None:
            options = ReadOptions.model_validate(source.source_metadata.get("read_options", {}))
        size, digest = 0, hashlib.sha256()
        with SpooledTemporaryFile(max_size=8 * 1024 * 1024) as buffer:
            while chunk := content.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_upload_bytes:
                    raise ApplicationError(
                        "UPLOAD_TOO_LARGE", "File exceeds the upload limit.", 413
                    )
                digest.update(chunk)
                buffer.write(chunk)
            buffer.seek(0)
            key, intent = reserve_artifact(self.session, self.storage, source.project_id, suffix)
            try:
                # Reserve before locking: the intent's FK is committed separately.
                # Hold the lock through adoption so deletion cannot race the write.
                ProjectService(self.session).lock(source.project_id)
                self.session.refresh(source)
                self.storage.save_reserved(key, cast(BinaryIO, buffer))
                resources = adapter.discover(key, options)
                version = SourceVersion(
                    source_id=source.id,
                    storage_key=key,
                    filename=name[:500],
                    file_size=size,
                    sha256=digest.hexdigest(),
                    workbook={
                        "connector": adapter.definition.type,
                        "resources": [r.model_dump() for r in resources],
                        "read_options": options.model_dump(),
                    },
                )
                self.session.add(version)
                adopt_artifact(self.session, intent)
                self.session.commit()
            except Exception as exc:
                discard_artifact(self.session, self.storage, key, intent)
                if isinstance(exc, (ValueError, ExcelWorkbookError)):
                    raise ApplicationError("INVALID_IMPORT", str(exc)) from exc
                raise
        self.session.refresh(version)
        return version

    def raw(self, connector: str, key: str, resource: str, options: ReadOptions) -> Dataset:
        batches = list(FileAdapter(connector, self.storage).read_batches(key, resource, options))
        return Dataset(pl.concat([b.frame for b in batches]), batches[0].schema)

    def prepare(
        self,
        source: SourceSnapshot,
        version: SourceVersion,
        item: UpdateItem,
        result: CheckResult,
        checkpoint: Callable[[], None] | None = None,
    ) -> SourceSnapshot:
        metadata = dict(source.source_metadata)
        active = dict(metadata.get("active_snapshots", {}))
        metadata.update({"source_version_id": str(version.id), "active_snapshots": active})
        if version.workbook.get("resources"):
            metadata["resources"] = version.workbook["resources"]
        if version.workbook.get("read_options"):
            metadata["read_options"] = version.workbook["read_options"]
        override = SourceSnapshot(item.source_id, version.storage_key, metadata)
        if item.mode != "replace":
            result.issues.append(
                CheckIssue(
                    severity="error",
                    message=(
                        "Prepared datasets support complete replacement only. "
                        "Use an explicit Union for periods."
                    ),
                )
            )
            return override
        if not active:
            result.issues.append(
                CheckIssue(
                    severity="error", message="Finish the initial import before replacing its data."
                )
            )
            return override
        bindings = {b.resource_id: b for b in item.dataset_bindings}
        if len(bindings) != len(item.dataset_bindings) or not set(bindings) <= set(active):
            result.issues.append(
                CheckIssue(
                    severity="error", message="Choose each existing dataset once for mapping."
                )
            )
            return override
        for resource_id, snapshot_id in tuple(active.items()):
            if checkpoint:
                checkpoint()
            try:
                previous = self.session.get(DatasetSnapshot, uuid.UUID(snapshot_id))
                if previous is None or previous.source_id != item.source_id:
                    raise ValueError("The previous dataset is unavailable.")
                profile = ImportProfile.model_validate(previous.profile)
                original = self.session.get(SourceVersion, previous.source_version_id)
                if original is None:
                    raise ValueError("The previous source version is unavailable.")
                binding = bindings.get(resource_id)
                target = binding.target_resource_id if binding else profile.resource_id
                options = (
                    binding.options
                    if binding and binding.options
                    else ReadOptions.model_validate(version.workbook["read_options"])
                    if metadata["connector"] == "csv" and version.workbook.get("read_options")
                    else profile.options
                )
                incoming = self.raw(metadata["connector"], version.storage_key, target, options)
                before = self.raw(
                    metadata["connector"],
                    original.storage_key,
                    profile.resource_id,
                    profile.options,
                )
                old_names = Counter(c.display_name for c in before.schema.columns)
                new_names = Counter(c.display_name for c in incoming.schema.columns)
                original_names = {c.column_id: c.display_name for c in before.schema.columns}
                incoming_columns = {c.display_name: c.column_id for c in incoming.schema.columns}
                suggestions = []
                for field in profile.fields:
                    name = original_names[field.source_field]
                    if old_names[name] == new_names[name] == 1:
                        suggestions.append(
                            ColumnBinding(
                                logical_id=field.field_id,
                                physical_id=incoming_columns[name],
                            )
                        )
                result.dataset_profiles.append(
                    DatasetMappingProfile(
                        source_id=item.source_id,
                        version_id=version.id,
                        resource_id=resource_id,
                        target_resource_id=target,
                        name=profile.name,
                        options=options,
                        old_columns=[
                            ResolvedColumnRead.model_validate(c)
                            for c in previous.dataset_schema["columns"]
                        ],
                        new_columns=[
                            ResolvedColumnRead(**c.to_dict()) for c in incoming.schema.columns
                        ],
                        suggestions=suggestions,
                        old_rows=previous.row_count,
                        new_rows=incoming.row_count,
                        new_examples=transport_rows(incoming.frame.head(3)),
                    )
                )
                mapping = binding.columns if binding and binding.columns else suggestions
                ids = {m.logical_id: m.physical_id for m in mapping}
                if (
                    set(ids) != {f.field_id for f in profile.fields}
                    or len(ids) != len(mapping)
                    or len(set(ids.values())) != len(ids)
                ):
                    raise ValueError("Map every existing field to a different incoming column.")
                updated = ImportProfile.model_validate(
                    {
                        **profile.model_dump(),
                        "resource_id": target,
                        "options": options,
                        "fields": [
                            {**f.model_dump(), "source_field": ids[f.field_id]}
                            for f in profile.fields
                        ],
                    }
                )
                data, preview = normalize(incoming, updated)
                result.issues.extend(
                    CheckIssue(
                        severity=i.severity,
                        message=i.message,
                        examples=[
                            {
                                "Dataset": profile.name,
                                "Field": next(
                                    (f.name for f in profile.fields if f.field_id == i.field_id), ""
                                ),
                                "Row": i.row,
                            }
                        ],
                    )
                    for i in preview.issues
                )
                if not preview.can_apply:
                    # Samples are bounded. An error beyond the first 100 warnings still
                    # has to block the complete update, including unused datasets.
                    result.issues.append(
                        CheckIssue(
                            severity="error",
                            message="Correct conversion errors before applying the import.",
                            examples=[{"Dataset": profile.name}],
                        )
                    )
                    continue
                unused = len(incoming.schema.columns) - len(ids)
                if unused:
                    result.issues.append(
                        CheckIssue(
                            severity="warning",
                            count=unused,
                            message="Incoming columns outside the confirmed profile "
                            "are not imported.",
                            examples=[{"Dataset": profile.name}],
                        )
                    )
                snapshot = self.stage(version, resource_id, updated, data)
                active[resource_id] = str(snapshot)
            except (ValueError, KeyError, StopIteration, ExcelWorkbookError, OSError) as exc:
                result.issues.append(
                    CheckIssue(severity="error", message=str(exc) or "Invalid dataset mapping.")
                )
        return override

    def stage(
        self, version: SourceVersion, resource_id: str, profile: ImportProfile, data: Dataset
    ) -> uuid.UUID:
        fingerprint = hashlib.sha256(
            json.dumps(
                {"resource": resource_id, "profile": profile.model_dump(mode="json")},
                sort_keys=True,
            ).encode()
        ).hexdigest()
        request_id = uuid.uuid5(version.id, f"staged-v1:{fingerprint}")
        # Separate durable staging transaction: worker progress/cancellation never publishes
        # source pointers. Retained snapshots can be reused by another check after restart.
        with Session(self.session.get_bind()) as staging:
            existing = staging.scalar(
                select(DatasetSnapshot).where(
                    DatasetSnapshot.source_id == version.source_id,
                    DatasetSnapshot.request_id == request_id,
                )
            )
            if existing is not None:
                if (
                    existing.request_hash != fingerprint
                    or existing.source_version_id != version.id
                    or existing.resource_id != resource_id
                ):
                    raise ValueError("The staged import request conflicts with another snapshot.")
                if not self.storage.exists(existing.storage_key):
                    raise ValueError(
                        "The staged dataset file is unavailable. Restore storage before retrying."
                    )
                return existing.id
            source = staging.get(DataSource, version.source_id)
            if source is None:
                raise ValueError("The data source is unavailable.")
            key, intent = reserve_artifact(staging, self.storage, source.project_id, ".parquet")
            identity = uuid.uuid4()
            try:
                ProjectService(staging).lock(source.project_id)
                staging.refresh(source)
                buffer = io.BytesIO()
                data.frame.write_parquet(buffer)
                buffer.seek(0)
                self.storage.save_reserved(key, buffer)
                snapshot = DatasetSnapshot(
                    id=identity,
                    source_id=version.source_id,
                    source_version_id=version.id,
                    resource_id=resource_id,
                    request_id=request_id,
                    request_hash=fingerprint,
                    storage_key=key,
                    row_count=data.row_count,
                    profile=profile.model_dump(mode="json"),
                    dataset_schema=data.schema.to_dict(),
                )
                staging.add(snapshot)
                adopt_artifact(staging, intent)
                staging.commit()
            except Exception:
                discard_artifact(staging, self.storage, key, intent)
                raise
            return identity
