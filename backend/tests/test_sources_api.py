import uuid
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.infrastructure.database import get_session
from app.infrastructure.storage import LocalStorageProvider, get_storage_provider
from app.main import app
from app.models import Project, Workflow, WorkflowNode


def xlsx_bytes() -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Sales"
    sheet.append(["country", "quantity", "price"])
    sheet.append(["Korea", 2, 10.5])
    stream = BytesIO()
    workbook.save(stream)
    workbook.close()
    return stream.getvalue()


def make_client(db_engine: Engine, tmp_path: Path, *, max_bytes: int = 1_000_000) -> TestClient:
    def override_session():  # type: ignore[no-untyped-def]
        with Session(db_engine, expire_on_commit=False) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_storage_provider] = lambda: LocalStorageProvider(tmp_path)
    app.dependency_overrides[get_settings] = lambda: Settings(
        database_url="sqlite://", storage_root=tmp_path, max_upload_bytes=max_bytes
    )
    return TestClient(app)


def create_project(db_engine: Engine) -> uuid.UUID:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Sales Analysis"))
        session.commit()
    return project_id


def test_upload_list_preview_and_delete(db_engine: Engine, tmp_path: Path) -> None:
    project_id = create_project(db_engine)
    client = make_client(db_engine, tmp_path)

    uploaded = client.post(
        f"/api/v1/projects/{project_id}/sources/excel",
        files={"file": ("../../sales.xlsx", xlsx_bytes(), "application/octet-stream")},
    )
    source_id = uploaded.json()["id"]

    assert uploaded.status_code == 201
    assert uploaded.json()["original_filename"] == "../../sales.xlsx"
    assert uploaded.json()["workbook"]["sheets"][0]["name"] == "Sales"
    assert (
        client.get(f"/api/v1/projects/{project_id}/sources").json()["items"][0]["id"] == source_id
    )
    preview = client.get(f"/api/v1/sources/{source_id}/sheets/Sales/preview?limit=500")
    assert preview.status_code == 200
    assert preview.json()["rows"] == [{"col_1": "Korea", "col_2": 2, "col_3": 10.5}]
    assert client.delete(f"/api/v1/sources/{source_id}").status_code == 204
    assert list(tmp_path.rglob("*.xlsx")) == []
    app.dependency_overrides.clear()


def test_upload_validation_is_controlled(db_engine: Engine, tmp_path: Path) -> None:
    project_id = create_project(db_engine)
    client = make_client(db_engine, tmp_path, max_bytes=8)

    unsupported = client.post(
        f"/api/v1/projects/{project_id}/sources/excel",
        files={"file": ("sales.csv", b"a,b", "text/csv")},
    )
    oversized = client.post(
        f"/api/v1/projects/{project_id}/sources/excel",
        files={"file": ("sales.xlsx", b"more than eight bytes", "application/octet-stream")},
    )
    corrupt_client = make_client(db_engine, tmp_path)
    corrupt = corrupt_client.post(
        f"/api/v1/projects/{project_id}/sources/excel",
        files={"file": ("sales.xlsm", b"not a workbook", "application/octet-stream")},
    )

    assert unsupported.status_code == 415
    assert oversized.status_code == 413
    assert corrupt.status_code == 422
    assert corrupt.json()["detail"]["code"] == "INVALID_WORKBOOK"
    assert not any(path.is_file() for path in tmp_path.rglob("*"))
    app.dependency_overrides.clear()


def test_source_in_use_cannot_be_deleted(db_engine: Engine, tmp_path: Path) -> None:
    project_id = create_project(db_engine)
    client = make_client(db_engine, tmp_path)
    uploaded = client.post(
        f"/api/v1/projects/{project_id}/sources/excel",
        files={"file": ("sales.xlsx", xlsx_bytes(), "application/octet-stream")},
    ).json()
    with Session(db_engine) as session:
        workflow = Workflow(id=uuid.uuid4(), project_id=project_id, name="Main")
        session.add(workflow)
        session.flush()
        session.add(
            WorkflowNode(
                workflow_id=workflow.id,
                node_type="excel_source",
                node_version=1,
                position_x=0,
                position_y=0,
                config={"source_id": uploaded["id"]},
                ui_state={},
            )
        )
        session.commit()

    response = client.delete(f"/api/v1/sources/{uploaded['id']}")

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "SOURCE_IN_USE"
    app.dependency_overrides.clear()
