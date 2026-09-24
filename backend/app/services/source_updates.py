"""Staged immutable workbook replacement and explicit logical field bindings."""

import hashlib
import json
import uuid
from collections import Counter
from collections.abc import Callable
from dataclasses import asdict
from pathlib import PurePosixPath
from tempfile import SpooledTemporaryFile
from typing import Any, BinaryIO, cast

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.datasets import LogicalType
from app.domain.errors import ApplicationError
from app.infrastructure.excel import ExcelWorkbookError, OpenPyxlWorkbookReader
from app.infrastructure.storage import StorageProvider
from app.models import (
    Dashboard,
    DashboardWidget,
    DataSource,
    ReportDocument,
    SourceVersion,
    Visualization,
    Workflow,
    WorkflowNode,
)
from app.nodes.excel_source import ExcelSourceConfig
from app.schemas.reporting import (
    CheckIssue,
    CheckResult,
    ColumnBinding,
    MappingProfile,
    UpdateItem,
    UpdateRead,
    UpdateSave,
)
from app.schemas.workflows import ResolvedColumnRead
from app.services.file_cleanup import drain_deletions, enqueue_deletion
from app.services.projects import ProjectService
from app.services.source_access import ProjectSourceAccess, SourceSnapshot, profile_key


def state_token(session: Session, project_id: uuid.UUID) -> str:
    state: list[object] = []
    for model in (Workflow, Visualization, Dashboard):
        state.append(
            sorted(
                (str(row.id), row.revision)
                for row in session.execute(
                    select(model.id, model.revision).where(model.project_id == project_id)
                )
            )
        )
    state.append(
        sorted(
            (str(row.id), row.storage_key, json.dumps(row.source_metadata, sort_keys=True))
            for row in session.execute(
                select(DataSource.id, DataSource.storage_key, DataSource.source_metadata).where(
                    DataSource.project_id == project_id
                )
            )
        )
    )
    state.append(
        sorted(
            (str(row.id), row.revision)
            for row in session.execute(
                select(ReportDocument.id, ReportDocument.revision).where(
                    ReportDocument.project_id == project_id, ReportDocument.kind == "rules"
                )
            )
        )
    )
    return hashlib.sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()


def document(session: Session, identity: uuid.UUID, kind: str) -> ReportDocument:
    row = session.scalar(
        select(ReportDocument)
        .where(ReportDocument.id == identity, ReportDocument.kind == kind)
        .execution_options(populate_existing=True)
    )
    if row is None:
        raise ApplicationError("DOCUMENT_NOT_FOUND", "Report document does not exist.", 404)
    return row


def change_document(
    session: Session, row: ReportDocument, revision: int, payload: dict[str, Any], status: str
) -> None:
    changed = session.execute(
        update(ReportDocument)
        .where(ReportDocument.id == row.id, ReportDocument.revision == revision)
        .values(revision=revision + 1, payload=payload, status=status)
    )
    if changed.rowcount != 1:  # type: ignore[attr-defined]
        session.rollback()
        raise ApplicationError(
            "REPORT_CONFLICT", "The report changed. Reload before applying your draft.", 409
        )
    session.flush()
    session.refresh(row)


def read_update(row: ReportDocument) -> UpdateRead:
    return UpdateRead(
        id=row.id,
        project_id=row.project_id,
        revision=row.revision,
        status=row.status,
        created_at=row.created_at,
        name=row.payload.get("name", "Data update"),
        items=[UpdateItem.model_validate(item) for item in row.payload.get("items", [])],
        check=CheckResult.model_validate(row.payload["check"])
        if row.payload.get("check")
        else None,
    )


class SourceUpdateService:
    def __init__(self, session: Session, storage: StorageProvider):
        self.session, self.storage = session, storage

    def upload_version(
        self, source_id: uuid.UUID, filename: str, content: BinaryIO, settings: Settings
    ) -> SourceVersion:
        source = self.session.get(DataSource, source_id)
        if source is None:
            raise ApplicationError("SOURCE_NOT_FOUND", "Data source does not exist.", 404)
        ProjectService(self.session).lock(source.project_id)
        suffix = PurePosixPath(filename.replace("\\", "/")).suffix.lower()
        if suffix not in {".xlsx", ".xlsm"}:
            raise ApplicationError(
                "UNSUPPORTED_FILE_TYPE", "Upload an .xlsx or .xlsm workbook.", 415
            )
        size = 0
        digest = hashlib.sha256()
        with SpooledTemporaryFile(
            max_size=min(settings.max_upload_bytes, 8 * 1024 * 1024)
        ) as buffer:
            while chunk := content.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_upload_bytes:
                    raise ApplicationError(
                        "UPLOAD_TOO_LARGE", "Workbook exceeds the upload limit.", 413
                    )
                digest.update(chunk)
                buffer.write(chunk)
            buffer.seek(0)
            key = self.storage.save(cast(BinaryIO, buffer), suffix=suffix)
        try:
            workbook = OpenPyxlWorkbookReader(self.storage).inspect(key)
            row = SourceVersion(
                source_id=source_id,
                storage_key=key,
                filename=filename[:500],
                file_size=size,
                sha256=digest.hexdigest(),
                workbook=asdict(workbook),
            )
            self.session.add(row)
            self.session.commit()
            self.session.refresh(row)
            return row
        except Exception as exc:
            self.session.rollback()
            enqueue_deletion(self.session, key)
            self.session.commit()
            drain_deletions(self.session, self.storage)
            if isinstance(exc, ExcelWorkbookError):
                raise ApplicationError("INVALID_WORKBOOK", str(exc)) from exc
            raise

    def create(self, project_id: uuid.UUID) -> ReportDocument:
        ProjectService(self.session).get(project_id)
        row = ReportDocument(
            project_id=project_id, kind="update", payload={"name": "Data update", "items": []}
        )
        self.session.add(row)
        self.session.commit()
        self.session.refresh(row)
        return row

    def save(self, row: ReportDocument, payload: UpdateSave) -> None:
        if row.status not in {"draft", "checked"}:
            raise ApplicationError("UPDATE_CLOSED", "This data update is already closed.", 409)
        if len({item.source_id for item in payload.items}) != len(payload.items):
            raise ApplicationError("DUPLICATE_SOURCE", "Choose each source only once.")
        for item in payload.items:
            self.version(row.project_id, item)
        retained = (
            {"rollback_snapshots": row.payload["rollback_snapshots"]}
            if row.payload.get("rollback_snapshots") and payload.items == read_update(row).items
            else {}
        )
        change_document(
            self.session,
            row,
            payload.expected_revision,
            {
                "name": payload.name,
                "items": [item.model_dump(mode="json") for item in payload.items],
                **retained,
            },
            "draft",
        )
        self.session.commit()

    def version(self, project_id: uuid.UUID, item: UpdateItem) -> SourceVersion:
        version = self.session.scalar(
            select(SourceVersion)
            .join(DataSource)
            .where(
                SourceVersion.id == item.version_id,
                SourceVersion.source_id == item.source_id,
                DataSource.project_id == project_id,
            )
        )
        if version is None:
            raise ApplicationError(
                "VERSION_NOT_FOUND", "Workbook version is not in this project.", 404
            )
        return version

    def prepare(
        self, row: ReportDocument, progress: Callable[[int], None] | None = None
    ) -> tuple[CheckResult, dict[uuid.UUID, SourceSnapshot]]:
        result = CheckResult(token=state_token(self.session, row.project_id))
        current = ProjectSourceAccess(row.project_id, self.session, self.storage)
        reader = OpenPyxlWorkbookReader(self.storage)
        overrides: dict[uuid.UUID, SourceSnapshot] = {}
        if row.payload.get("rollback_snapshots"):
            for identity, saved in row.payload["rollback_snapshots"].items():
                overrides[uuid.UUID(identity)] = SourceSnapshot(
                    uuid.UUID(identity), saved["storage_key"], saved["metadata"]
                )
            return result, overrides
        items = read_update(row).items
        if not items:
            result.issues.append(
                CheckIssue(severity="error", message="Choose at least one workbook to update.")
            )
        for item_index, item in enumerate(items):
            if progress:
                progress(int(40 * item_index / max(1, len(items))))
            version = self.version(row.project_id, item)
            bindings: dict[str, object] = {}
            nodes = self.session.scalars(
                select(WorkflowNode).join(Workflow).where(Workflow.project_id == row.project_id)
            ).all()
            profiles = {}
            for node in nodes:
                if node.node_type in {"excel_source", "excel_periods"} and str(
                    node.config.get("source_id")
                ) == str(item.source_id):
                    config = ExcelSourceConfig.model_validate(node.config)
                    profiles[profile_key(config.sheet_name, config.layout())] = (config, node)
                    result.affected_workflows.append(str(node.workflow_id))
            for key, (config, node) in profiles.items():
                if progress:
                    progress(int(40 * item_index / max(1, len(items))))
                try:
                    previous = current.load(item.source_id, config.sheet_name, config.layout())
                    explicit = next(
                        (
                            mapping
                            for mapping in item.bindings
                            if profile_key(mapping.sheet_name, mapping.layout) == key
                        ),
                        None,
                    )
                    target = explicit.target_sheet if explicit else config.sheet_name
                    incoming = reader.load_sheet(version.storage_key, target, config.layout())
                    old_names = Counter(c.display_name for c in previous.schema.columns)
                    new_names = Counter(c.display_name for c in incoming.schema.columns)
                    suggestions = [
                        ColumnBinding(logical_id=old.column_id, physical_id=new.column_id)
                        for old in previous.schema.columns
                        for new in incoming.schema.columns
                        if old.display_name == new.display_name
                        and old_names[old.display_name] == new_names[new.display_name] == 1
                    ]
                    mapping = explicit.columns if explicit and explicit.columns else suggestions
                    result.profiles.append(
                        MappingProfile(
                            source_id=item.source_id,
                            sheet_name=config.sheet_name,
                            target_sheet=target,
                            layout=config.layout(),
                            old_columns=[
                                ResolvedColumnRead(**c.to_dict()) for c in previous.schema.columns
                            ],
                            new_columns=[
                                ResolvedColumnRead(**c.to_dict()) for c in incoming.schema.columns
                            ],
                            suggestions=suggestions,
                            old_rows=previous.row_count,
                            new_rows=incoming.row_count,
                            old_examples=previous.frame.head(3).to_dicts(),
                            new_examples=incoming.frame.head(3).to_dicts(),
                        )
                    )
                    ids = {m.logical_id: m.physical_id for m in mapping}
                    if len(ids) != len(mapping) or len(set(ids.values())) != len(ids):
                        raise ValueError("Map each field to a different incoming column.")
                    translated = []
                    for column in previous.schema.columns:
                        if column.column_id not in ids:
                            raise ValueError(
                                f"Choose the incoming field for {column.display_name}."
                            )
                        physical = incoming.schema.by_id(ids[column.column_id])
                        if (
                            column.logical_type != physical.logical_type
                            and physical.logical_type != LogicalType.UNKNOWN
                        ):
                            raise ValueError(
                                f"Field type changed: {column.display_name}. "
                                "Use explicit conversion or correct the workbook."
                            )
                        translated.append(
                            {
                                "column": {**column.to_dict(), "nullable": physical.nullable},
                                "physical_id": physical.column_id,
                            }
                        )
                    for column in incoming.schema.columns:
                        if column.column_id not in ids.values():
                            name = (
                                "added_"
                                + hashlib.sha256(
                                    f"{key}:{column.column_id}:{column.display_name}".encode()
                                ).hexdigest()[:16]
                            )
                            translated.append(
                                {
                                    "column": {
                                        **column.to_dict(),
                                        "column_id": name,
                                        "engine_name": name,
                                    },
                                    "physical_id": column.column_id,
                                }
                            )
                    bindings[key] = {"sheet_name": target, "columns": translated}
                except (ValueError, KeyError, StopIteration) as exc:
                    result.issues.append(
                        CheckIssue(
                            severity="error",
                            message=str(exc) or "Invalid field mapping.",
                            node_id=str(node.id),
                            workflow_id=str(node.workflow_id),
                        )
                    )
            metadata: dict[str, Any] = {
                "workbook": version.workbook,
                "version_id": str(version.id),
                "bindings": bindings,
            }
            if item.mode != "replace":
                before = current.snapshots[item.source_id]
                periods = list(before.source_metadata.get("periods", []))
                if not periods:
                    if not item.baseline_period.strip():
                        result.issues.append(
                            CheckIssue(
                                severity="error",
                                message="Name the existing data period before appending.",
                            )
                        )
                    periods = [
                        {
                            "period": item.baseline_period.strip(),
                            "storage_key": before.storage_key,
                            "metadata": before.source_metadata,
                        }
                    ]
                if not item.period.strip():
                    result.issues.append(
                        CheckIssue(severity="error", message="Enter the incoming period label.")
                    )
                existing = [member for member in periods if member["period"] == item.period.strip()]
                if (
                    item.mode == "append"
                    and existing
                    or item.mode == "replace_period"
                    and not existing
                ):
                    result.issues.append(
                        CheckIssue(
                            severity="error",
                            message=(
                                "Period already exists or cannot be replaced. "
                                "Choose the correct mode."
                            ),
                        )
                    )
                remaining = [
                    member for member in periods if member["period"] != item.period.strip()
                ]
                for member in remaining:
                    with self.storage.open(member["storage_key"]) as file:
                        hasher = hashlib.sha256()
                        while chunk := file.read(1024 * 1024):
                            hasher.update(chunk)
                        digest = hasher.hexdigest()
                    if digest == version.sha256:
                        result.issues.append(
                            CheckIssue(
                                severity="error",
                                message="This workbook is already included in the period set.",
                            )
                        )
                replacement = {
                    "period": item.period.strip(),
                    "storage_key": version.storage_key,
                    "metadata": dict(metadata),
                }
                metadata["periods"] = (
                    [
                        replacement if member["period"] == item.period.strip() else member
                        for member in periods
                    ]
                    if item.mode == "replace_period"
                    else [*periods, replacement]
                )
            overrides[item.source_id] = SourceSnapshot(
                item.source_id, version.storage_key, metadata
            )
        result.affected_workflows = sorted(set(result.affected_workflows))
        result.affected_visualizations = [
            str(v.id)
            for v in self.session.scalars(
                select(Visualization).where(
                    Visualization.workflow_id.in_([uuid.UUID(v) for v in result.affected_workflows])
                )
            )
        ]
        result.affected_reports = sorted(
            set(
                self.session.scalars(
                    select(Dashboard.name)
                    .join(DashboardWidget)
                    .where(
                        DashboardWidget.visualization_id.in_(
                            [uuid.UUID(v) for v in result.affected_visualizations]
                        )
                    )
                )
            )
        )
        return result, overrides

    def apply(self, row: ReportDocument, revision: int, acknowledge: bool) -> None:
        ProjectService(self.session).lock(row.project_id)
        self.session.refresh(row)
        checked = read_update(row).check
        if (
            row.status != "checked"
            or checked is None
            or checked.token != state_token(self.session, row.project_id)
        ):
            raise ApplicationError(
                "CHECK_STALE", "Run the checks again before applying this update.", 409
            )
        if any(issue.severity == "error" for issue in checked.issues):
            raise ApplicationError(
                "CHECK_FAILED", "Resolve report errors before applying this update."
            )
        if checked.issues and not acknowledge:
            raise ApplicationError(
                "WARNINGS_NOT_ACKNOWLEDGED", "Review and acknowledge the warnings."
            )
        previous = {}
        for identity, value in row.payload["prepared"].items():
            source = self.session.get(DataSource, uuid.UUID(identity))
            if source is None:
                raise ApplicationError("SOURCE_NOT_FOUND", "Data source does not exist.", 404)
            previous[identity] = {
                "storage_key": source.storage_key,
                "metadata": source.source_metadata,
                "filename": source.original_filename,
                "file_size": source.file_size,
            }
            source.storage_key, source.source_metadata = value["storage_key"], value["metadata"]
            source.original_filename, source.file_size = value["filename"], value["file_size"]
        nodes = self.session.scalars(
            select(WorkflowNode).join(Workflow).where(Workflow.project_id == row.project_id)
        ).all()
        touched = set()
        for node in nodes:
            value = row.payload["prepared"].get(str(node.config.get("source_id")))
            if value and node.node_type in {"excel_source", "excel_periods"}:
                # Preview/schema clients key freshness by workflow revision.
                touched.add(node.workflow_id)
                target_type = (
                    "excel_periods" if value["metadata"].get("periods") else "excel_source"
                )
                if node.node_type != target_type:
                    node.node_type = target_type
        for identity in touched:
            workflow = self.session.get(Workflow, identity)
            assert workflow is not None
            workflow.revision += 1
        change_document(
            self.session,
            row,
            revision,
            {**row.payload, "previous": previous, "warnings_acknowledged": acknowledge},
            "applied",
        )
        self.session.commit()
