import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier

import pytest
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.infrastructure.storage import LocalStorageProvider
from app.models import DatasetSnapshot, ReportDocument
from app.schemas.ingestion import ApplyImportRequest, SaveImportDraft
from app.services.import_drafts import ImportDraftService
from app.services.ingestion import IngestionService
from app.services.source_updates import state_token
from tests.test_sources_api import create_project, make_client


def test_draft_resume_conflicts_preview_apply_and_retry(db_engine: Engine, tmp_path: Path) -> None:
    project = create_project(db_engine)
    client = make_client(db_engine, tmp_path)
    source = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv", "delimiter": ";"},
        files={"file": ("sales.csv", b"code;amount\n001;0.10\n")},
    ).json()
    root = f"/api/v1/projects/{project}/imports/{source['id']}"
    initial = client.get(f"{root}/session").json()
    assert initial["source"]["has_draft"]
    assert initial["draft"]["revision"] == 0
    assert initial["draft"]["options"]["delimiter"] == ";"
    with Session(db_engine) as session:
        before = state_token(session, project)
        assert not list(session.scalars(select(ReportDocument)))  # GET never persists a draft.
    preview = client.post(
        f"/api/v1/imports/{source['id']}/inspect",
        json={"resource_id": "table", "options": initial["draft"]["options"]},
    ).json()
    profile = preview["profile"]
    profile["fields"][1]["name"] = "Revenue"
    profile["fields"][1]["currency"] = "RUB"
    settings = {
        "expected_revision": 0,
        "source_revision": 1,
        "resource_id": "table",
        "options": profile["options"],
        "profile": profile,
    }
    response = client.put(f"{root}/draft", json=settings)
    assert response.status_code == 200, response.text
    saved = response.json()
    assert saved["revision"] == 1
    assert client.put(f"{root}/draft", json=settings).json() == saved  # Lost save response.
    resumed = make_client(db_engine, tmp_path).get(f"{root}/session").json()
    assert resumed["draft"] == saved
    with Session(db_engine) as session:
        assert state_token(session, project) == before  # Drafts never stale report checks.
        assert not list(session.scalars(select(DatasetSnapshot)))
    settings["profile"]["name"] = "Other tab"
    conflict = client.put(f"{root}/draft", json=settings)
    assert conflict.status_code == 409, conflict.text
    assert client.get(f"{root}/session").json()["draft"] == saved
    apply = {
        "profile": saved["profile"],
        "expected_revision": 1,
        "request_id": saved["request_id"],
        "draft_revision": saved["revision"],
    }
    invalid = client.post(
        f"/api/v1/imports/{source['id']}/apply", json={**apply, "draft_revision": 2}
    )
    assert invalid.status_code == 409
    applied = client.post(f"/api/v1/imports/{source['id']}/apply", json=apply)
    assert applied.status_code == 200, applied.text
    assert client.post(f"/api/v1/imports/{source['id']}/apply", json=apply).json() == applied.json()
    complete = client.get(f"{root}/session").json()
    assert complete["draft"]["status"] == "applied"
    assert complete["draft"]["snapshot_id"] == applied.json()["id"]
    assert not complete["source"]["has_draft"]
    assert complete["source"]["revision"] == 2
    with Session(db_engine) as session:
        assert not list(
            session.scalars(select(ReportDocument).where(ReportDocument.kind == "artifact"))
        )


def test_drafts_validate_ownership_resource_options_and_stale_source(
    db_engine: Engine, tmp_path: Path
) -> None:
    project, other = create_project(db_engine), create_project(db_engine)
    client = make_client(db_engine, tmp_path)
    source = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv"},
        files={"file": ("data.csv", b"value\n1\n")},
    ).json()
    root = f"/api/v1/projects/{project}/imports/{source['id']}"
    assert client.get(f"/api/v1/projects/{other}/imports/{source['id']}/session").status_code == 404
    settings = {"expected_revision": 0, "source_revision": 1, "resource_id": "table"}
    assert (
        client.put(
            f"/api/v1/projects/{other}/imports/{source['id']}/draft", json=settings
        ).status_code
        == 404
    )
    assert (
        client.put(f"{root}/draft", json={**settings, "resource_id": "missing"}).status_code == 422
    )
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    invalid = client.put(
        f"{root}/draft", json={**settings, "profile": profile, "options": {"header_row": 2}}
    )
    assert invalid.status_code == 422
    saved = client.put(f"{root}/draft", json={**settings, "profile": profile}).json()
    client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid.uuid4())},
    )
    assert (
        client.put(
            f"{root}/draft", json={**settings, "expected_revision": saved["revision"]}
        ).status_code
        == 409
    )
    # Explicit restart keeps the draft revision check, but takes the new source revision.
    restarted = client.put(
        f"{root}/draft",
        json={**settings, "expected_revision": saved["revision"], "source_revision": 2},
    )
    assert restarted.status_code == 200, restarted.text
    assert restarted.json()["profile"] is None
    assert client.delete(f"/api/v1/sources/{source['id']}").status_code == 204
    with Session(db_engine) as session:
        assert not list(
            session.scalars(select(ReportDocument).where(ReportDocument.kind == "import_draft"))
        )
    assert not [p for p in tmp_path.rglob("*") if p.is_file()]


@pytest.mark.parametrize("operation", ["apply", "draft"])
def test_concurrent_import_requests_do_not_duplicate_or_overwrite(
    db_engine: Engine, tmp_path: Path, operation: str
) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent import project locks require PostgreSQL")
    project = create_project(db_engine)
    client = make_client(db_engine, tmp_path)
    source = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv"},
        files={"file": ("sales.csv", b"amount\n0.10\n")},
    ).json()
    preview = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()
    request_id, barrier = uuid.uuid4(), Barrier(2)

    def write(index: int) -> str:
        with Session(db_engine) as session:
            service = IngestionService(session, LocalStorageProvider(tmp_path))
            current = service.source(uuid.UUID(source["id"]))
            barrier.wait(timeout=10)
            try:
                if operation == "apply":
                    result = service.apply(
                        current,
                        ApplyImportRequest.model_validate(
                            {
                                "profile": preview["profile"],
                                "expected_revision": 1,
                                "request_id": request_id,
                            }
                        ),
                    )
                    return str(result.id)
                ImportDraftService(session).save(
                    current,
                    SaveImportDraft.model_validate(
                        {
                            "expected_revision": 0,
                            "source_revision": 1,
                            "resource_id": "table",
                            "profile": {**preview["profile"], "name": f"Tab {index}"},
                        }
                    ),
                )
                return "saved"
            except ApplicationError as exc:
                session.rollback()
                return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(write, [1, 2]))
    with Session(db_engine) as session:
        snapshots = list(session.scalars(select(DatasetSnapshot)))
        assert not list(
            session.scalars(select(ReportDocument).where(ReportDocument.kind == "artifact"))
        )
        if operation == "apply":
            assert len(snapshots) == 1
            assert outcomes == [str(snapshots[0].id)] * 2
            assert len(list(tmp_path.rglob("*.parquet"))) == 1
        else:
            assert set(outcomes) == {"saved", "IMPORT_DRAFT_CONFLICT"}
            assert not snapshots
