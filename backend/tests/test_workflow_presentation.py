from copy import deepcopy
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.main import app
from app.models import DataSource, Project
from app.nodes import get_node_registry
from app.schemas.workflows import WorkflowSave
from app.services.workflow_presentation import validate_presentation
from tests.test_workflows_api import client_for


def draft():  # type: ignore[no-untyped-def]
    ids = [str(uuid4()) for _ in range(4)]
    nodes = [
        {
            "id": identity,
            "type": kind,
            "version": 1,
            "position": {"x": i * 200, "y": 0},
            "config": config,
        }
        for i, (identity, kind, config) in enumerate(
            zip(
                ids,
                ["scalar_constant", "scalar_constant", "field_arithmetic", "field_arithmetic"],
                [{"value": 2}, {"value": 3}, {"operation": "multiply"}, {"operation": "add"}],
                strict=True,
            )
        )
    ]
    edges = [
        {
            "id": str(uuid4()),
            "source_node_id": ids[a],
            "source_port": "value",
            "target_node_id": ids[b],
            "target_port": port,
        }
        for a, b, port in [(0, 2, "a"), (1, 2, "b"), (2, 3, "a"), (0, 3, "b")]
    ]
    block = {
        "id": str(uuid4()),
        "label": "Multiply",
        "node_ids": [ids[2]],
        "position": {"x": 100, "y": 200},
        "collapsed": True,
        "inputs": [
            {"id": str(uuid4()), "label": port, "node_id": ids[2], "port": port}
            for port in ["a", "b"]
        ],
        "outputs": [{"id": str(uuid4()), "label": "Result", "node_id": ids[2], "port": "value"}],
    }
    return {
        "name": "Containers",
        "expected_revision": 1,
        "format_version": 2,
        "nodes": nodes,
        "edges": edges,
        "presentation": {"blocks": [block]},
    }


def test_containers_atomic_restore_omission_conflict_unpack_and_execution(
    db_engine: Engine,
) -> None:
    client = client_for(db_engine)
    try:
        project = client.post("/api/v1/projects", json={"name": "Presentation"}).json()
        created = client.post(
            f"/api/v1/projects/{project['id']}/workflows", json={"name": "Main"}
        ).json()
        assert "presentation" not in created
        path = f"/api/v1/workflows/{created['id']}"
        payload = draft()
        saved = client.put(path, json=payload)
        assert saved.status_code == 200, saved.text
        original = saved.json()
        assert client.get(path).json() == original
        target = payload["nodes"][-1]["id"]

        def result():  # type: ignore[no-untyped-def]
            response = client.post(path + f"/nodes/{target}/preview", json={})
            assert response.status_code == 200, response.text
            return response.json()["rows"]

        assert result() == [{"value": 8.0}]
        changed = deepcopy(payload)
        changed["expected_revision"] = 2
        changed["presentation"]["blocks"][0].update(label="Revenue", collapsed=False)
        saved = client.put(path, json=changed)
        assert saved.status_code == 200, saved.text
        assert (
            saved.json()["nodes"] == original["nodes"]
            and saved.json()["edges"] == original["edges"]
        )
        assert result() == [{"value": 8.0}]
        assert client.put(path, json=payload).status_code == 409
        assert client.get(path).json() == saved.json()
        # Older v2 client omitting metadata must not erase it.
        omitted = {key: value for key, value in changed.items() if key != "presentation"}
        omitted["expected_revision"] = 3
        retained = client.put(path, json=omitted)
        assert retained.status_code == 200
        assert retained.json()["presentation"] == saved.json()["presentation"]
        broken = {**omitted, "expected_revision": 4, "nodes": [], "edges": []}
        assert client.put(path, json=broken).status_code == 422
        assert client.get(path).json() == retained.json()
        assert (
            client.put(
                path, json={**omitted, "expected_revision": 4, "format_version": 1}
            ).status_code
            == 422
        )
        # Explicit empty metadata unwraps the block atomically without changing computations.
        unpacked = client.put(path, json={**omitted, "expected_revision": 4, "presentation": {}})
        assert unpacked.status_code == 200
        assert unpacked.json()["presentation"] == {"workbooks": [], "blocks": [], "results": []}
        assert result() == [{"value": 8.0}]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "mutation",
    [
        "missing",
        "overlap",
        "boundary",
        "foreign_port",
        "port_kind",
        "duplicate_port",
        "nested",
        "blank",
        "unknown",
    ],
)
def test_invalid_container_contract(mutation: str) -> None:
    payload = draft()
    block = payload["presentation"]["blocks"][0]
    if mutation == "missing":
        block["node_ids"] = [str(uuid4())]
    elif mutation == "overlap":
        other = deepcopy(block)
        other["id"] = str(uuid4())
        payload["presentation"]["blocks"].append(other)
    elif mutation == "boundary":
        block["outputs"] = []
    elif mutation == "foreign_port":
        block["outputs"][0]["node_id"] = payload["nodes"][0]["id"]
    elif mutation == "port_kind":
        block["outputs"][0]["column_id"] = "not-a-table"
    elif mutation == "duplicate_port":
        block["outputs"].append(deepcopy(block["outputs"][0]))
    elif mutation == "nested":
        block["node_ids"] = [block["id"]]
    elif mutation == "blank":
        block["label"] = "   "
    else:
        block["inner_graph"] = {}
    with pytest.raises((ApplicationError, ValidationError)):
        parsed = WorkflowSave.model_validate(payload)
        assert parsed.presentation is not None
        validate_presentation(parsed.presentation, parsed, get_node_registry())


def test_public_output_preserves_projected_field_identity() -> None:
    payload = draft()
    block = payload["presentation"]["blocks"][0]
    member = payload["nodes"][2]
    member.update(type="select_columns", config={})
    block["inputs"] = []
    payload["edges"] = [payload["edges"][2]]
    payload["edges"][0].update(source_port="dataset", source_column_id="field-id")
    block["outputs"][0].update(port="dataset", column_id="field-id")
    parsed = WorkflowSave.model_validate(payload)
    assert parsed.presentation is not None
    validate_presentation(parsed.presentation, parsed, get_node_registry())
    block["outputs"][0]["column_id"] = "different-field"
    parsed = WorkflowSave.model_validate(payload)
    assert parsed.presentation is not None
    with pytest.raises(ApplicationError, match="crossing a block boundary"):
        validate_presentation(parsed.presentation, parsed, get_node_registry())


def test_workbook_roundtrip_and_wrong_source_roll_back(db_engine: Engine) -> None:
    project_id, source_id = uuid4(), uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Books"))
        session.flush()
        session.add(
            DataSource(
                id=source_id,
                project_id=project_id,
                type="excel",
                name="Book",
                original_filename="book.xlsx",
                storage_key=uuid4().hex,
                file_size=1,
                status="ready",
            )
        )
        session.commit()
    client = client_for(db_engine)
    try:
        created = client.post(
            f"/api/v1/projects/{project_id}/workflows", json={"name": "Books"}
        ).json()
        path = f"/api/v1/workflows/{created['id']}"
        node_id = str(uuid4())
        book = {
            "id": str(uuid4()),
            "label": "Book",
            "source_id": str(source_id),
            "node_ids": [node_id],
            "detached_node_ids": [node_id],
            "position": {"x": 0, "y": 0},
        }
        payload = {
            "name": "Books",
            "expected_revision": 1,
            "format_version": 2,
            "nodes": [
                {
                    "id": node_id,
                    "type": "excel_source",
                    "version": 1,
                    "position": {"x": 0, "y": 0},
                    "config": {"source_id": str(source_id), "sheet_name": "Sales"},
                }
            ],
            "edges": [],
            "presentation": {"workbooks": [book]},
        }
        saved = client.put(path, json=payload)
        assert saved.status_code == 200, saved.text
        assert client.get(path).json() == saved.json()
        book["source_id"] = str(uuid4())
        payload["expected_revision"] = 2
        assert client.put(path, json=payload).status_code == 422
        assert client.get(path).json() == saved.json()
    finally:
        app.dependency_overrides.clear()


def test_presentation_migration_refuses_loss(db_engine: Engine) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Migration DDL is validated on PostgreSQL")
    test_workbook_roundtrip_and_wrong_source_roll_back(db_engine)
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).parents[1] / "migrations"))
    with db_engine.begin() as connection:
        config.attributes["connection"] = connection
        with pytest.raises(RuntimeError, match="Cannot downgrade while workflow containers"):
            command.downgrade(config, "20260921_0007")
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "20260921_0008"
        connection.execute(text("UPDATE workflows SET presentation = '{}'"))
        command.downgrade(config, "20260921_0007")
        command.upgrade(config, "head")
        assert connection.scalar(text("SELECT presentation FROM workflows")) == {}
