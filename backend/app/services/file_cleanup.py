import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.storage import StorageProvider
from app.models.persistence import FileDeletion

logger = logging.getLogger("nodebi.storage")


def enqueue_deletion(session: Session, key: str) -> None:
    if session.get(FileDeletion, key) is None:
        session.add(FileDeletion(storage_key=key))


def drain_deletions(session: Session, storage: StorageProvider) -> int:
    """Idempotent cleanup. Pending rows survive failures and application restarts."""
    completed = 0
    for pending in session.scalars(select(FileDeletion).limit(100)).all():
        try:
            storage.delete(pending.storage_key)
        except Exception:
            logger.exception("Source artifact cleanup will be retried")
            continue
        session.delete(pending)
        completed += 1
    session.commit()
    return completed


if __name__ == "__main__":
    from app.infrastructure.database import SessionFactory
    from app.infrastructure.storage import get_storage_provider

    with SessionFactory() as database_session:
        # Executed once before the single application worker starts, never during jobs.
        from app.models import ReportDocument

        for intent in database_session.scalars(
            select(ReportDocument).where(
                ReportDocument.kind == "artifact", ReportDocument.status == "staging"
            )
        ).all():
            for artifact_key in intent.payload.get("artifact_keys", []):
                enqueue_deletion(database_session, artifact_key)
            database_session.delete(intent)
        database_session.commit()
        print(f"Removed {drain_deletions(database_session, get_storage_provider())} artifacts")
