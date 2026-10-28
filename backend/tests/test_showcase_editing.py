import uuid
from pathlib import Path

import pytest
from sqlalchemy.engine import Engine

from app.main import app
from scripts.showcase import finance, logistics, sales
from tests.test_dataset_updates import check
from tests.test_sources_api import make_client


@pytest.mark.parametrize(
    "scenario,source_name,column,value,changed_types",
    [
        (finance, "executive-orders", 4, "123456.78", {"heatmap_chart", "combo_chart"}),
        (
            sales,
            "Продажи · регион и продукт за полугодие",
            3,
            "123456.78",
            {"bar_chart", "pareto_chart", "treemap_chart", "sunburst_chart"},
        ),
        (
            logistics,
            "Доставки · 160 синтетических заказов",
            2,
            "18",
            {"box_plot", "heatmap_chart", "histogram_chart", "line_chart"},
        ),
    ],
)
def test_showcase_files_are_editable_and_refresh_connected_views(
    db_engine: Engine, tmp_path: Path, scenario, source_name, column, value, changed_types
) -> None:
    client = make_client(db_engine, tmp_path)
    try:
        scenario(client)
        project = client.get("/api/v1/projects").json()["items"][0]["id"]
        sources = client.get(f"/api/v1/projects/{project}/imports").json()
        assert len(sources) == 2  # No independent static export of sales totals.
        selected = None
        for source in sources:
            response = client.post(
                f"/api/v1/projects/{project}/file-updates",
                json={"source_id": source["id"], "request_id": str(uuid.uuid4())},
            )
            assert response.status_code == 200, response.text
            update = response.json()
            root = f"/api/v1/updates/{update['id']}"
            workspace = client.get(root + "/editor/workspace")
            assert workspace.status_code == 200, workspace.text
            page = workspace.json()["page"]
            assert page["total_rows"] > 0 and page["rows"]
            assert client.get(root + "/files/current").content
            if source["name"] == source_name:
                selected = root, page
        assert selected is not None
        visuals = client.get(f"/api/v1/projects/{project}/visualizations").json()["items"]
        tracked = [v for v in visuals if v["type"] in changed_types]
        assert {v["type"] for v in tracked} == changed_types

        def data(visual):
            result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
            assert result.status_code == 200, result.text
            payload = result.json()
            return payload["rows"], payload.get("datasets")

        before = {v["id"]: data(v) for v in tracked}
        root, page = selected
        saved = client.post(
            root + "/editor",
            json={
                "expected_revision": page["revision"],
                "resource_id": page["resource_id"],
                "request_id": str(uuid.uuid4()),
                "cells": [{"row_id": page["rows"][0]["id"], "column": column, "value": value}],
            },
        )
        assert saved.status_code == 200, saved.text
        prepared = client.post(
            root + "/editor/prepare",
            json={"expected_revision": saved.json()["revision"], "request_id": str(uuid.uuid4())},
        )
        assert prepared.status_code == 200, prepared.text
        checked = check(client, project, prepared.json())
        assert not any(i["severity"] == "error" for i in checked["check"]["issues"])
        applied = client.post(
            root + "/apply",
            json={"expected_revision": checked["revision"], "acknowledge_warnings": True},
        )
        assert applied.status_code == 200, applied.text
        for visual in tracked:
            assert data(visual) != before[visual["id"]], visual["name"]
    finally:
        client.close()
        app.dependency_overrides.clear()
