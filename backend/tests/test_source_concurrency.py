import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier

import pytest
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_sources_api import create_project, make_client, xlsx_bytes

from app.domain.errors import ApplicationError
from app.infrastructure.storage import LocalStorageProvider
from app.main import app
from app.models import DataSource, Workflow, WorkflowNode
from app.nodes import get_node_registry
from app.schemas.workflows import WorkflowSave
from app.services.sources import SourceService
from app.services.workflows import save_graph


def test_concurrent_source_delete_and_new_reference_have_consistent_outcome(
    db_engine: Engine, tmp_path: Path
) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent row locks require PostgreSQL")
    project_id = create_project(db_engine)
    client = make_client(db_engine, tmp_path)
    try:
        uploaded = client.post(
            f"/api/v1/projects/{project_id}/sources/excel",
            files={"file": ("sales.xlsx", xlsx_bytes())},
        ).json()
        created = client.post(
            f"/api/v1/projects/{project_id}/workflows", json={"name": "Race"}
        ).json()
    finally:
        app.dependency_overrides.clear()
    source_id, workflow_id = uuid.UUID(uploaded["id"]), uuid.UUID(created["id"])
    barrier = Barrier(2)
    payload = WorkflowSave.model_validate(
        {
            "name": "Race",
            "expected_revision": 1,
            "nodes": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "excel_source",
                    "version": 1,
                    "position": {"x": 0, "y": 0},
                    "config": {"source_id": str(source_id), "sheet_name": "Sales"},
                }
            ],
            "edges": [],
        }
    )

    def operation(save: bool) -> str:
        with Session(db_engine) as session:
            source = session.get(DataSource, source_id)
            workflow = session.get(Workflow, workflow_id)
            assert source and workflow
            barrier.wait(timeout=10)
            try:
                if save:
                    save_graph(session, workflow, payload, get_node_registry())
                    return "saved"
                SourceService(session, LocalStorageProvider(tmp_path)).delete(source)
                return "deleted"
            except ApplicationError as exc:
                session.rollback()
                return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = set(pool.map(operation, [True, False]))
    assert outcomes in ({"saved", "SOURCE_IN_USE"}, {"deleted", "INVALID_SOURCE"})
    with Session(db_engine) as session:
        source = session.get(DataSource, source_id)
        nodes = list(
            session.scalars(select(WorkflowNode).where(WorkflowNode.workflow_id == workflow_id))
        )
        assert (
            (source is not None and len(nodes) == 1)
            if "saved" in outcomes
            else (source is None and not nodes)
        )
