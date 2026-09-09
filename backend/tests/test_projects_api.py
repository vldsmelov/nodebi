import uuid

from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.infrastructure.database import get_session
from app.main import app
from app.models import Dashboard, Project


def make_client(db_engine: Engine) -> TestClient:
    def override_session():  # type: ignore[no-untyped-def]
        with Session(db_engine, expire_on_commit=False) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    return TestClient(app)


def test_project_crud_and_validation(db_engine: Engine) -> None:
    client = make_client(db_engine)

    invalid = client.post("/api/v1/projects", json={"name": "   "})
    created = client.post("/api/v1/projects", json={"name": "  Sales   Analysis  "})
    project_id = created.json()["id"]

    assert invalid.status_code == 422
    assert created.status_code == 201
    assert created.json()["name"] == "Sales Analysis"
    assert client.get("/api/v1/projects").json()["items"][0]["id"] == project_id
    assert client.get(f"/api/v1/projects/{project_id}").status_code == 200
    assert (
        client.patch(f"/api/v1/projects/{project_id}", json={"name": "Revenue"}).json()["name"]
        == "Revenue"
    )
    assert client.delete(f"/api/v1/projects/{project_id}").status_code == 409
    assert client.delete(f"/api/v1/projects/{project_id}?confirm=true").status_code == 204
    assert client.get(f"/api/v1/projects/{project_id}").status_code == 404
    app.dependency_overrides.clear()


def test_project_delete_cascades_children(db_engine: Engine) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Temporary"))
        session.flush()
        session.add(Dashboard(project_id=project_id, name="Dashboard"))
        session.commit()

    client = make_client(db_engine)
    assert client.delete(f"/api/v1/projects/{project_id}?confirm=true").status_code == 204
    with Session(db_engine) as session:
        assert session.get(Dashboard, project_id) is None
        assert session.query(Dashboard).count() == 0
    app.dependency_overrides.clear()
