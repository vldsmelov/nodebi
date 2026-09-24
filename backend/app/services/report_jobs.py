"""Durable jobs run on the application's background worker, not in request transactions."""

import logging
import uuid
from typing import Any

from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.infrastructure.storage import StorageProvider
from app.models import ReportDocument
from app.schemas.reporting import JobRead
from app.services.projects import ProjectService
from app.services.report_checks import check_project
from app.services.source_access import ProjectSourceAccess
from app.services.source_updates import SourceUpdateService, change_document, document, state_token

WORKER_INSTANCE = str(uuid.uuid4())


def read_job(row: ReportDocument) -> JobRead:
    return JobRead(
        id=row.id,
        revision=row.revision,
        status=row.status,
        progress=row.payload.get("progress", 0),
        message=row.payload.get("message", ""),
        result_id=row.payload.get("result_id"),
        check=row.payload.get("check"),
    )


def create_job(
    session: Session, project_id: uuid.UUID, operation: str, arguments: dict[str, Any]
) -> ReportDocument:
    ProjectService(session).lock(project_id)
    for active in session.scalars(
        select(ReportDocument).where(
            ReportDocument.project_id == project_id,
            ReportDocument.kind == "job",
            ReportDocument.status.in_(["queued", "running"]),
        )
    ):
        if active.payload.get("worker") == WORKER_INSTANCE:
            raise ApplicationError(
                "JOB_RUNNING", "Wait for the current report task or cancel it.", 409
            )
        change_document(
            session,
            active,
            active.revision,
            {**active.payload, "message": "The server restarted. Run the task again."},
            "interrupted",
        )
    row = ReportDocument(
        project_id=project_id,
        kind="job",
        status="queued",
        payload={
            "operation": operation,
            "arguments": arguments,
            "progress": 0,
            "worker": WORKER_INSTANCE,
        },
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


class JobCancelled(Exception):
    pass


def run_job(
    bind: Engine, identity: uuid.UUID, storage: StorageProvider, settings: Settings
) -> None:
    artifacts: list[str] = []

    def progress(value: int) -> None:
        with Session(bind) as tracking:
            job = document(tracking, identity, "job")
            if job.status == "cancelled":
                raise JobCancelled()
            change_document(
                tracking,
                job,
                job.revision,
                {**job.payload, "progress": max(value, job.payload.get("progress", 0))},
                "running",
            )
            tracking.commit()

    try:
        progress(1)
        with Session(bind, expire_on_commit=False) as session:
            job = document(session, identity, "job")
            args = job.payload["arguments"]
            operation = job.payload["operation"]
            result_id = None
            if operation == "update":
                row = document(session, uuid.UUID(args["update_id"]), "update")
                revision = args["expected_revision"]
                if row.revision != revision or row.status not in {"draft", "checked"}:
                    raise ApplicationError(
                        "REPORT_CONFLICT",
                        "The report changed. Reload before applying your draft.",
                        409,
                    )
                service = SourceUpdateService(session, storage)
                check, overrides = service.prepare(row, progress)
                if not any(issue.severity == "error" for issue in check.issues):
                    check = check_project(
                        session,
                        row.project_id,
                        storage,
                        settings,
                        ProjectSourceAccess(row.project_id, session, storage, overrides=overrides),
                        check,
                        progress,
                    )
                prepared = {}
                for item in row.payload["items"]:
                    from app.schemas.reporting import UpdateItem

                    version = service.version(row.project_id, UpdateItem.model_validate(item))
                    snapshot = overrides[version.source_id]
                    prepared[str(version.source_id)] = {
                        "storage_key": snapshot.storage_key,
                        "metadata": snapshot.source_metadata,
                        "filename": version.filename,
                        "file_size": version.file_size,
                    }
                progress(95)
                if check.token != state_token(session, row.project_id):
                    raise ApplicationError(
                        "CHECK_STALE", "Data changed while checks ran. Run checks again.", 409
                    )
                change_document(
                    session,
                    row,
                    revision,
                    {**row.payload, "check": check.model_dump(mode="json"), "prepared": prepared},
                    "checked",
                )
                result_id = row.id
            elif operation == "release":
                from app.schemas.reporting import ReleaseRequest
                from app.services.report_releases import create_release

                release = create_release(
                    session,
                    job.project_id,
                    ReleaseRequest.model_validate(args),
                    storage,
                    settings,
                    progress,
                    artifacts,
                )
                result_id = release.id
                check = None
            else:
                check = check_project(
                    session,
                    job.project_id,
                    storage,
                    settings,
                    ProjectSourceAccess(job.project_id, session, storage),
                    progress=progress,
                )
                progress(95)
                if check.token != state_token(session, job.project_id):
                    raise ApplicationError(
                        "CHECK_STALE", "Data changed while checks ran. Run checks again.", 409
                    )
            # Cancellation is checked again before publishing the result transaction.
            fresh = document(session, identity, "job")
            if fresh.status == "cancelled":
                raise JobCancelled()
            change_document(
                session,
                fresh,
                fresh.revision,
                {
                    **fresh.payload,
                    "progress": 100,
                    "check": check.model_dump(mode="json") if check else None,
                    "result_id": str(result_id) if result_id else None,
                },
                "succeeded",
            )
            session.commit()
            artifacts.clear()
    except JobCancelled:
        return
    except Exception as exc:
        logging.getLogger(__name__).exception("Report job failed: %s", identity)
        with Session(bind) as session:
            failed = session.get(ReportDocument, identity)
            if failed is None or failed.status == "cancelled":
                return
            message = (
                str(exc)
                if isinstance(exc, (ApplicationError, ValueError))
                else f"Report job failed. Diagnostic: {identity}"
            )
            change_document(
                session, failed, failed.revision, {**failed.payload, "message": message}, "failed"
            )
            session.commit()
    finally:
        if artifacts:
            from app.services.file_cleanup import drain_deletions, enqueue_deletion

            with Session(bind) as cleanup:
                for key in artifacts:
                    enqueue_deletion(cleanup, key)
                cleanup.commit()
                drain_deletions(cleanup, storage)


def interrupt_jobs(session: Session) -> None:
    for row in session.scalars(
        select(ReportDocument).where(
            ReportDocument.kind == "job", ReportDocument.status.in_(["queued", "running"])
        )
    ):
        change_document(
            session,
            row,
            row.revision,
            {**row.payload, "message": "The server restarted. Run the task again."},
            "interrupted",
        )
    session.commit()
