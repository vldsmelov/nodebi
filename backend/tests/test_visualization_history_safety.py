import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from queue import Queue

import pytest
from sqlalchemy import select, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_dashboards import analytical_graph
from test_workflows_api import client_for

from app.domain.errors import ApplicationError
from app.main import app
from app.models import DashboardWidget, Project, Visualization, Workflow
from app.schemas.workflows import WorkflowSave
from app.services.visualization_index import protect_used_visualizations


def test_delete_waits_for_concurrent_widget_attachment(db_engine: Engine, tmp_path: Path) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Shared visualization row locks require PostgreSQL")
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="History race"))
        session.commit()
    client = client_for(db_engine, tmp_path)
    try:
        graph = analytical_graph(client, project_id)
        chart = next(node for node in graph["nodes"] if node["type"] == "bar_chart")
        dashboard = client.post(
            f"/api/v1/projects/{project_id}/dashboards", json={"name": "Concurrent"}
        ).json()
        payload = WorkflowSave.model_validate(
            {
                **graph,
                "expected_revision": graph["revision"],
                "nodes": [node for node in graph["nodes"] if node["id"] != chart["id"]],
                "edges": [edge for edge in graph["edges"] if edge["target_node_id"] != chart["id"]],
            }
        )
        pid_queue: Queue[int] = Queue()

        def remove() -> str:
            with Session(db_engine) as session:
                pid_queue.put(session.scalar(text("select pg_backend_pid()")))
                workflow = session.get(Workflow, uuid.UUID(graph["id"]))
                assert workflow is not None
                try:
                    protect_used_visualizations(session, workflow, payload)
                except ApplicationError as exc:
                    return exc.code
                return "unprotected"

        with Session(db_engine) as attaching, ThreadPoolExecutor(max_workers=1) as pool:
            attaching.scalar(
                select(Visualization)
                .where(Visualization.id == uuid.UUID(chart["id"]))
                .with_for_update(read=True)
            )
            attaching.add(
                DashboardWidget(
                    dashboard_id=uuid.UUID(dashboard["id"]),
                    visualization_id=uuid.UUID(chart["id"]),
                    position_x=0,
                    position_y=0,
                    width=6,
                    height=4,
                )
            )
            attaching.flush()
            future = pool.submit(remove)
            try:
                pid = pid_queue.get(timeout=5)
                deadline = time.monotonic() + 5
                with db_engine.connect() as observer:
                    while not observer.scalar(
                        text("select cardinality(pg_blocking_pids(:pid)) > 0"), {"pid": pid}
                    ):
                        assert time.monotonic() < deadline, "Deletion never waited on attachment"
                        time.sleep(0.01)
                attaching.commit()
            finally:
                attaching.rollback()
            assert future.result(timeout=5) == "VISUALIZATION_IN_USE"
    finally:
        app.dependency_overrides.clear()
