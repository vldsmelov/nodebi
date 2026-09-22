from uuid import uuid4

from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.main import app
from app.models import Project
from tests.test_workflows_api import client_for


def test_format_upgrade_is_explicit_and_old_client_cannot_overwrite(db_engine: Engine) -> None:
    with Session(db_engine) as session:
        project = Project(id=uuid4(), name="Version guard")
        session.add(project)
        session.commit()
        project_id = project.id
    client = client_for(db_engine)
    try:
        graph = client.post(
            f"/api/v1/projects/{project_id}/workflows", json={"name": "Draft"}
        ).json()
        path = f"/api/v1/workflows/{graph['id']}"
        draft = {"name": "Draft", "nodes": [], "edges": [], "expected_revision": graph["revision"]}
        ordinary = client.put(path, json=draft)
        assert ordinary.status_code == 200
        assert ordinary.json()["version"] == 1
        # A stale save cannot partially upgrade the format.
        stale = client.put(path, json={**draft, "format_version": 2})
        assert stale.status_code == 409
        assert client.get(path).json() == ordinary.json()
        draft["expected_revision"] = ordinary.json()["revision"]
        upgraded = client.put(path, json={**draft, "format_version": 2})
        assert upgraded.status_code == 200
        assert upgraded.json()["version"] == 2
        draft["expected_revision"] = upgraded.json()["revision"]
        # Even a current revision must not let a v1 client discard a new format.
        rejected = client.put(path, json={**draft, "name": "Overwritten"})
        assert rejected.status_code == 409
        assert "WORKFLOW_FORMAT_UNSUPPORTED" in rejected.text
        assert client.get(path).json() == upgraded.json()
        saved = client.put(path, json={**draft, "format_version": 2, "name": "New editor"})
        assert saved.status_code == 200
        assert saved.json()["revision"] == upgraded.json()["revision"] + 1
        assert saved.json()["version"] == 2
        unknown = client.put(
            path,
            json={
                **draft,
                "expected_revision": saved.json()["revision"],
                "format_version": 2,
                "presentation": {"composites": []},
            },
        )
        assert unknown.status_code == 422
        assert client.get(path).json() == saved.json()
        unsupported = client.put(path, json={**draft, "format_version": 4})
        assert unsupported.status_code == 422
        assert client.get(path).json() == saved.json()
    finally:
        app.dependency_overrides.clear()
