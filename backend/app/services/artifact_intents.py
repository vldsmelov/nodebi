"""Durable intent precedes bytes; adoption must share the metadata transaction."""

import uuid

from sqlalchemy.orm import Session

from app.infrastructure.storage import StorageProvider
from app.models import ReportDocument
from app.services.file_cleanup import drain_deletions, enqueue_deletion


def reserve_artifact(
    session: Session, storage: StorageProvider, project_id: uuid.UUID, suffix: str
) -> tuple[str, uuid.UUID]:
    key = storage.reserve_key(suffix=suffix)
    with Session(session.get_bind()) as tracking:
        intent = ReportDocument(
            project_id=project_id,
            kind="artifact",
            status="staging",
            payload={"artifact_keys": [key]},
        )
        tracking.add(intent)
        tracking.commit()
        return key, intent.id


def adopt_artifact(session: Session, intent_id: uuid.UUID) -> None:
    intent = session.get(ReportDocument, intent_id)
    if intent is None:
        raise RuntimeError("Artifact cleanup intent is unavailable.")
    session.delete(intent)


def discard_artifact(
    session: Session, storage: StorageProvider, key: str, intent_id: uuid.UUID
) -> None:
    session.rollback()
    intent = session.get(ReportDocument, intent_id)
    if intent is None:
        # Adoption may already have committed even if a later read/response failed.
        # Never delete a published artifact on the error path after adoption.
        return
    enqueue_deletion(session, key)
    session.delete(intent)
    session.commit()
    drain_deletions(session, storage)
