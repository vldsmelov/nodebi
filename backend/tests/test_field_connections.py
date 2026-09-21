from pathlib import Path
from uuid import UUID, uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.main import app
from app.models import Project
from app.schemas.workflows import EdgePayload
from app.services.workflows import domain_graph, get_workflow
from tests.test_workflows_api import client_for


def test_field_connection_roundtrip_conflict_and_explicit_execution_guard(
    db_engine: Engine,
) -> None:
    project_id = uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Field connections"))
        session.commit()
    client = client_for(db_engine)
    try:
        graph = client.post(
            f"/api/v1/projects/{project_id}/workflows", json={"name": "Fields"}
        ).json()
        path = f"/api/v1/workflows/{graph['id']}"
        nodes = [
            {
                "id": str(uuid4()),
                "type": "select_columns",
                "version": 1,
                "position": {"x": 0, "y": 0},
                "config": {"column_ids": ["stable-field"]},
            }
            for _ in range(2)
        ]
        edge = {
            "id": str(uuid4()),
            "source_node_id": nodes[0]["id"],
            "source_port": "dataset",
            "target_node_id": nodes[1]["id"],
            "target_port": "input",
            "source_column_id": "stable-field",
        }
        payload = {"name": "Fields", "expected_revision": 1, "nodes": nodes, "edges": [edge]}
        old = client.put(path, json=payload)
        assert old.status_code == 422
        assert "WORKFLOW_FORMAT_REQUIRED" in old.text
        assert client.get(path).json() == graph
        payload["format_version"] = 2
        saved = client.put(path, json=payload)
        assert saved.status_code == 200, saved.text
        assert saved.json()["edges"] == [edge]
        # A fresh DB session must restore the projection all the way to the execution domain.
        with Session(db_engine) as session:
            domain = domain_graph(session, get_workflow(session, UUID(graph["id"])))
            assert domain.edges[0].source_column_id == "stable-field"
        stale = client.put(path, json={**payload, "edges": [{**edge, "source_column_id": "other"}]})
        assert stale.status_code == 409
        assert client.get(path).json() == saved.json()
        downgrade = client.put(
            path, json={**payload, "format_version": 1, "expected_revision": 2, "edges": []}
        )
        assert downgrade.status_code == 409
        assert client.get(path).json() == saved.json()
        schema = client.get(path + "/schema")
        assert schema.status_code == 200
        assert schema.json()["valid"] is False
        assert any(
            issue["code"] == "FIELD_ROUTING_UNAVAILABLE" for issue in schema.json()["issues"]
        )
        preview = client.post(path + f"/nodes/{nodes[1]['id']}/preview", json={})
        assert preview.status_code == 422
        assert "FIELD_ROUTING_UNAVAILABLE" in preview.text
        # Unchanged IDs with a changed human label do not rewrite the connection.
        renamed = client.put(
            path,
            json={
                **payload,
                "expected_revision": 2,
                "nodes": [{**node, "ui": {"label": "Renamed"}} for node in nodes],
            },
        )
        assert renamed.status_code == 200
        assert renamed.json()["edges"] == [edge]
    finally:
        app.dependency_overrides.clear()


def test_old_edge_wire_shape_is_unchanged() -> None:
    edge = {
        "id": str(uuid4()),
        "source_node_id": str(uuid4()),
        "source_port": "dataset",
        "target_node_id": str(uuid4()),
        "target_port": "input",
    }
    assert EdgePayload.model_validate(edge).model_dump(mode="json") == edge


def test_migration_refuses_to_erase_field_semantics(db_engine: Engine) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Migration DDL is validated on PostgreSQL")
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).parents[1] / "migrations"))
    # Use the same ordinary save path to create a v2 field edge in the isolated test schema.
    test_field_connection_roundtrip_conflict_and_explicit_execution_guard(db_engine)
    with db_engine.begin() as connection:
        config.attributes["connection"] = connection
        with pytest.raises(RuntimeError, match="Cannot downgrade while field connections"):
            command.downgrade(config, "20260915_0006")
        assert (
            connection.scalar(text("SELECT source_column_id FROM workflow_edges")) == "stable-field"
        )
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "20260921_0007"
        connection.execute(text("UPDATE workflow_edges SET source_column_id = NULL"))
        command.downgrade(config, "20260915_0006")
        command.upgrade(config, "head")
        assert connection.scalar(text("SELECT count(*) FROM workflow_edges")) == 1
        assert connection.scalar(text("SELECT source_column_id FROM workflow_edges")) is None
