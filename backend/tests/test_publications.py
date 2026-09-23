from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import UTC, date, datetime
from pathlib import Path
from threading import Barrier
from uuid import UUID, uuid4

import polars as pl
import pytest
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_dashboards import analytical_graph
from test_typed_execution import edge, node, setup
from test_workflows_api import client_for

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import ApplicationError
from app.domain.parameters import ParameterDefinition
from app.domain.publications import (
    ContextPoint,
    DataContext,
    DatePeriod,
    PublishedOutput,
    ResultCatalog,
    ViewContext,
)
from app.main import app
from app.nodes import get_node_registry
from app.schemas.dashboards import IndependentVisualizationSave
from app.services.execution import WorkflowExecutionService
from app.services.independent_visualizations import IndependentVisualizationService
from app.services.publication_execution import compile_publication


def test_independent_documents_preview_copy_and_workflow_cas(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Published sales"}).json()
        graph = analytical_graph(client, project["id"])
        chart = next(n for n in graph["nodes"] if n["type"] == "bar_chart")
        source = next(
            e["source_node_id"] for e in graph["edges"] if e["target_node_id"] == chart["id"]
        )
        publication = {
            "id": str(uuid4()),
            "name": "Sales by category",
            "node_id": source,
            "port": "dataset",
            "kind": "dataset",
        }
        path = f"/api/v1/workflows/{graph['id']}"
        response = client.put(
            path,
            json={
                **{
                    k: v
                    for k, v in graph.items()
                    if k
                    in {"name", "nodes", "edges", "parameters", "presentation", "result_catalog"}
                },
                "format_version": 3,
                "expected_revision": graph["revision"],
                "result_catalog": {"outputs": [publication]},
            },
        )
        assert response.status_code == 200, response.text
        graph = response.json()
        # Presentation-only result cards share publication identity and graph CAS.
        position = {"publication_id": publication["id"], "position": {"x": 120, "y": 80}}

        def save_positions(presentation: dict[str, object]) -> dict[str, object]:
            nonlocal graph
            saved = client.put(
                path,
                json={
                    "name": graph["name"],
                    "nodes": graph["nodes"],
                    "edges": graph["edges"],
                    "format_version": 3,
                    "expected_revision": graph["revision"],
                    "presentation": presentation,
                },
            )
            assert saved.status_code == 200, saved.text
            graph = saved.json()
            return graph["presentation"]

        assert save_positions({"results": [position]})["results"] == [position]
        assert save_positions({})["results"] == [position]
        assert save_positions({"results": []}).get("results", []) == []
        assert save_positions({"results": [position]})["results"] == [position]
        invalid = client.put(
            path,
            json={
                "name": graph["name"],
                "nodes": graph["nodes"],
                "edges": graph["edges"],
                "format_version": 3,
                "expected_revision": graph["revision"],
                "presentation": {"results": [position, position]},
            },
        )
        assert invalid.status_code == 422
        assert client.get(path).json() == graph
        body = {
            "workflow_id": graph["id"],
            "publication_id": publication["id"],
            "expected_workflow_revision": graph["revision"],
            "name": "Revenue",
            "type": "bar_chart",
            "config": chart["config"],
        }
        prefix = f"/api/v1/projects/{project['id']}/visualizations"
        before = client.get(prefix).json()
        preview = client.post(prefix + "/preview", json=body)
        assert preview.status_code == 200, preview.text
        assert preview.json()["rows"] == [
            {"category": "A", "total": 50.0},
            {"category": "B", "total": 10.0},
        ]
        assert client.get(prefix).json() == before
        response = client.post(prefix, json=body)
        assert response.status_code == 201, response.text
        visual = response.json()
        assert visual["node_id"] == source
        assert client.get(path).json() == graph
        vpath = f"/api/v1/visualizations/{visual['id']}"
        updated = client.put(vpath, json={**body, "expected_revision": 1, "name": "Shared"}).json()
        assert updated["revision"] == 2
        assert client.put(vpath, json={**body, "expected_revision": 1}).status_code == 409
        assert (
            client.post(vpath + "/copy", json={**body, "expected_revision": 1}).status_code == 409
        )
        copied = client.post(vpath + "/copy", json={**body, "expected_revision": 2}).json()
        assert copied["id"] != visual["id"] and copied["revision"] == 1
        assert client.get(path).json() == graph
        assert client.get(vpath + "/result").json()["rows"] == preview.json()["rows"]
        # Current revision cannot authorize an old client to erase catalog metadata.
        assert (
            client.put(
                path,
                json={
                    **{
                        k: v
                        for k, v in graph.items()
                        if k
                        in {
                            "name",
                            "nodes",
                            "edges",
                            "parameters",
                            "presentation",
                            "result_catalog",
                        }
                    },
                    "format_version": 2,
                    "result_catalog": None,
                    "expected_revision": graph["revision"],
                },
            ).status_code
            == 409
        )
        removed = client.put(
            path,
            json={
                **{
                    k: v
                    for k, v in graph.items()
                    if k
                    in {"name", "nodes", "edges", "parameters", "presentation", "result_catalog"}
                },
                "format_version": 3,
                "expected_revision": graph["revision"],
                "result_catalog": {},
            },
        )
        assert removed.status_code == 409
        assert client.get(path).json() == graph
        graph["result_catalog"]["outputs"][0]["name"] = "Renamed publication"
        saved = client.put(
            path,
            json={
                **{
                    k: v
                    for k, v in graph.items()
                    if k
                    in {"name", "nodes", "edges", "parameters", "presentation", "result_catalog"}
                },
                "format_version": 3,
                "expected_revision": graph["revision"],
            },
        )
        assert saved.status_code == 200, saved.text
        assert client.get(vpath).json() == updated
        board = client.post(
            f"/api/v1/projects/{project['id']}/dashboards", json={"name": "Board"}
        ).json()
        attached = client.put(
            f"/api/v1/dashboards/{board['id']}",
            json={
                **board,
                "expected_revision": board["revision"],
                "widgets": [
                    {
                        "id": str(uuid4()),
                        "visualization_id": visual["id"],
                        "x": 0,
                        "y": 0,
                        "width": 6,
                        "height": 6,
                    }
                ],
            },
        )
        assert attached.status_code == 200, attached.text
        assert client.delete(vpath, params={"expected_revision": 2}).status_code == 409
        assert (
            client.delete(
                f"/api/v1/visualizations/{copied['id']}", params={"expected_revision": 1}
            ).status_code
            == 204
        )
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("temporal", ["date", "naive", "aware"])
def test_period_precedes_field_calculation_and_reuses_immutable_source(temporal: str) -> None:
    graph, context, source = setup()
    values = [datetime(2026, 1, 31, 23, 59), datetime(2026, 2, 1), None]
    if temporal == "date":
        dates = [value.date() if value else None for value in values]
        dtype = LogicalType.DATE
    else:
        # UTC times straddle midnight in Moscow.
        dates = (
            [datetime(2026, 1, 31, 20, 59, tzinfo=UTC), datetime(2026, 1, 31, 21, tzinfo=UTC), None]
            if temporal == "aware"
            else values
        )
        dtype = LogicalType.DATETIME
    source.dataset = Dataset(
        source.dataset.frame.with_columns(pl.Series("date", dates)),
        DatasetSchema(
            (*source.dataset.schema.columns, ColumnSchema("d", "date", "Date", dtype, True))
        ),
    )
    binding = DataContext(
        id=uuid4(),
        name="Sales context",
        points=[
            ContextPoint(node_id=graph.nodes[0].id, port="dataset", column_id="d", role="period")
        ],
    )
    published = PublishedOutput(
        id=uuid4(),
        name="Revenue",
        node_id=graph.nodes[-1].id,
        port="value",
        kind="scalar",
        context_ids=[binding.id],
    )
    catalog = ResultCatalog(outputs=[published], contexts=[binding])
    registry = get_node_registry()
    engine = WorkflowExecutionService(registry)
    for start, end, expected in [
        ("2026-01-01", "2026-01-31", 20),
        ("2026-02-01", "2026-02-28", 60),
        ("2026-01-01", "2026-02-28", 80),
    ]:
        view = ViewContext(
            period=DatePeriod(start=date.fromisoformat(start), end=date.fromisoformat(end))
        )
        compiled, target, applied, unsupported = compile_publication(
            graph, published, catalog, view, registry
        )
        result = engine.execute(compiled, target, context, output_port="value")
        assert result.output.frame.item() == expected
        assert len(applied) == 1 and unsupported == []
    assert source.loads == 1
    assert len(graph.nodes) == 4


def test_independent_kpi_rejects_multiple_rows_without_implicit_aggregation(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Strict KPI"}).json()
        graph = analytical_graph(client, project["id"])
        source = next(n for n in graph["nodes"] if n["type"] == "excel_source")
        publication = {
            "id": str(uuid4()),
            "name": "Raw",
            "node_id": source["id"],
            "port": "dataset",
            "kind": "dataset",
        }
        saved = client.put(
            f"/api/v1/workflows/{graph['id']}",
            json={
                **{
                    k: v
                    for k, v in graph.items()
                    if k
                    in {"name", "nodes", "edges", "parameters", "presentation", "result_catalog"}
                },
                "format_version": 3,
                "expected_revision": graph["revision"],
                "result_catalog": {"outputs": [publication]},
            },
        ).json()
        preview = client.post(
            f"/api/v1/projects/{project['id']}/visualizations/preview",
            json={
                "workflow_id": graph["id"],
                "publication_id": publication["id"],
                "expected_workflow_revision": saved["revision"],
                "name": "KPI",
                "type": "kpi",
                "config": {"value_column_id": "col_2"},
            },
        )
        assert preview.status_code == 422, preview.text
        assert "exactly one row" in preview.text
    finally:
        app.dependency_overrides.clear()


def test_selection_after_denominator_and_highlight_only_preserve_comparison() -> None:
    graph, context, source = setup()
    origin = graph.nodes[0]
    total = node("window", operation="sum", column_id="p", name="denominator")
    graph = replace(graph, nodes=(origin, total), edges=(edge(origin, total, "input"),))
    binding = DataContext(
        id=uuid4(),
        name="Context",
        roles=[ParameterDefinition(name="service", logical_type="integer")],
        points=[ContextPoint(node_id=total.id, port="dataset", column_id="q", role="service")],
    )
    publication = PublishedOutput(
        id=uuid4(),
        name="Service comparison",
        node_id=total.id,
        port="dataset",
        kind="dataset",
        context_ids=[binding.id],
        semantic_fields={"service": "q"},
    )
    catalog = ResultCatalog(outputs=[publication], contexts=[binding])
    registry = get_node_registry()
    engine = WorkflowExecutionService(registry)
    for highlight, count in [([], 1), (["service"], 3)]:
        compiled, target, _, _ = compile_publication(
            graph,
            publication,
            catalog,
            ViewContext(values={"service": 2}, highlight_only=highlight),
            registry,
        )
        result = engine.execute(compiled, target, context)
        assert result.output.row_count == count
        assert result.output.frame["denominator"].to_list() == [60.0] * count
    assert source.loads == 1


def test_conversion_keeps_visualization_ids_and_checks_workflow_revision(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Conversion"}).json()
        graph = analytical_graph(client, project["id"])
        visuals = client.get(f"/api/v1/projects/{project['id']}/visualizations").json()["items"]
        before = {
            item["id"]: client.get(f"/api/v1/visualizations/{item['id']}/result").json()["rows"]
            for item in visuals
        }
        path = f"/api/v1/workflows/{graph['id']}/convert-visualizations"
        assert (
            client.post(
                path, json={"expected_revision": graph["revision"] - 1, "dashboard_revisions": {}}
            ).status_code
            == 409
        )
        assert client.get(f"/api/v1/workflows/{graph['id']}").json() == graph
        trial = client.post(
            path,
            json={
                "expected_revision": graph["revision"],
                "dashboard_revisions": {},
                "dry_run": True,
            },
        )
        assert trial.status_code == 200, trial.text
        assert trial.json()["version"] == 3
        assert client.get(f"/api/v1/workflows/{graph['id']}").json() == graph
        assert (
            client.get(f"/api/v1/projects/{project['id']}/visualizations").json()["items"]
            == visuals
        )
        converted = client.post(
            path, json={"expected_revision": graph["revision"], "dashboard_revisions": {}}
        )
        assert converted.status_code == 200, converted.text
        assert converted.json()["version"] == 3
        assert len(converted.json()["nodes"]) == len(graph["nodes"]) - len(visuals)
        for identity, rows in before.items():
            assert client.get(f"/api/v1/visualizations/{identity}").json()["publication_id"]
            assert client.get(f"/api/v1/visualizations/{identity}/result").json()["rows"] == rows
    finally:
        app.dependency_overrides.clear()


def test_concurrent_visualization_edits_do_not_overwrite_each_other(
    db_engine: Engine, tmp_path: Path
) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent visualization CAS requires PostgreSQL")
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Concurrent charts"}).json()
        graph = analytical_graph(client, project["id"])
        response = client.post(
            f"/api/v1/workflows/{graph['id']}/convert-visualizations",
            json={"expected_revision": graph["revision"], "dashboard_revisions": {}},
        )
        assert response.status_code == 200, response.text
        graph = response.json()
        visual = client.get(f"/api/v1/projects/{project['id']}/visualizations").json()["items"][0]
        gate = Barrier(2)

        def edit(name: str) -> str:
            with Session(db_engine) as session:
                service = IndependentVisualizationService(session)
                service.get(UUID(visual["id"]))
                gate.wait(timeout=5)
                try:
                    service.save(
                        UUID(project["id"]),
                        IndependentVisualizationSave(
                            workflow_id=UUID(graph["id"]),
                            publication_id=UUID(visual["publication_id"]),
                            expected_workflow_revision=graph["revision"],
                            expected_revision=visual["revision"],
                            name=name,
                            type=visual["type"],
                            config=visual["config"],
                        ),
                        UUID(visual["id"]),
                    )
                    return "saved"
                except ApplicationError as error:
                    session.rollback()
                    return error.code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(edit, ["First edit", "Second edit"]))
        assert sorted(results) == ["VISUALIZATION_CONFLICT", "saved"]
        assert (
            client.get(f"/api/v1/visualizations/{visual['id']}").json()["revision"]
            == visual["revision"] + 1
        )
        assert client.get(f"/api/v1/workflows/{graph['id']}").json() == graph
    finally:
        app.dependency_overrides.clear()
