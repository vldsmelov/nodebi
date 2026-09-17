import uuid
from datetime import datetime
from io import BytesIO
from pathlib import Path

from openpyxl import Workbook
from sqlalchemy.engine import Engine
from test_workflows_api import client_for

from app.main import app


def test_labeled_choices_keep_typed_ids_search_and_selected_value(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Equipment lookup"}).json()
        book = Workbook()
        sheet = book.active
        sheet.title = "Equipment"
        sheet.append(["id", "label", "ambiguous", "date", "enabled"])
        sheet.append([1, "Pump", "Alpha", datetime(2026, 1, 1, 12, 30), True])
        sheet.append([1, "Pump", "Beta", datetime(2026, 1, 1, 12, 30), True])
        sheet.append([2, "Pump", "Gamma", datetime(2026, 1, 2, 12, 30), False])
        sheet.append([3, "Valve [X]", "Delta", datetime(2026, 1, 3, 12, 30), None])
        sheet.append([4, None, "Last", datetime(2026, 1, 4, 12, 30), None])
        sheet.append([None, "Ignored", None, None, None])
        stream = BytesIO()
        book.save(stream)
        book.close()
        source = client.post(
            f"/api/v1/projects/{project['id']}/sources/excel",
            files={"file": ("equipment.xlsx", stream.getvalue())},
        ).json()
        workflow = client.post(
            f"/api/v1/projects/{project['id']}/workflows", json={"name": "Equipment"}
        ).json()
        node_id = str(uuid.uuid4())
        graph = client.put(
            f"/api/v1/workflows/{workflow['id']}",
            json={
                "name": workflow["name"],
                "expected_revision": workflow["revision"],
                "nodes": [
                    {
                        "id": node_id,
                        "type": "excel_source",
                        "version": 1,
                        "position": {"x": 0, "y": 0},
                        "config": {"source_id": source["id"], "sheet_name": "Equipment"},
                    }
                ],
                "edges": [],
            },
        ).json()
        endpoint = f"/api/v1/workflows/{workflow['id']}/nodes/{node_id}/values"
        config = {"column_id": "col_1", "label_column_id": "col_2"}
        result = client.post(endpoint, json=config).json()
        assert result["choices"] == [
            {"value": 1, "label": "Pump"},
            {"value": 2, "label": "Pump"},
            {"value": 3, "label": "Valve [X]"},
            {"value": 4, "label": None},
        ]
        assert result["values"] == [1, 2, 3, 4]
        assert result["revision"] == graph["revision"]
        searched = client.post(
            endpoint, json=config | {"search": "pump", "limit": 1, "selected_value": 3}
        ).json()
        assert searched["choices"] == [{"value": 1, "label": "Pump"}]
        assert searched["truncated"] is True
        assert searched["selected"] == {"value": 3, "label": "Valve [X]"}
        assert client.post(endpoint, json=config | {"search": "[x]"}).json()["values"] == [3]
        assert client.post(endpoint, json=config | {"search": "4"}).json()["values"] == [4]
        assert (
            client.post(endpoint, json=config | {"selected_value": 99}).json()["selected"] is None
        )
        assert client.post(endpoint, json=config | {"selected_value": "1"}).status_code == 422
        legacy = client.post(endpoint, json={"column_id": "col_1"}).json()
        assert legacy["values"] == result["values"]
        assert legacy["label_column"] is None
        for selected, column in [(False, "col_5"), ("2026-01-04T12:30:00", "col_4")]:
            value = client.post(
                endpoint, json={"column_id": column, "selected_value": selected, "limit": 1}
            ).json()
            assert value["selected"]["value"] == selected
        conflict = client.post(
            endpoint, json=config | {"label_column_id": "col_3", "search": "absent"}
        )
        assert conflict.status_code == 422
        assert conflict.json()["detail"]["code"] == "AMBIGUOUS_PARAMETER_LABEL"
        assert conflict.json()["detail"]["node_id"] == node_id
        assert (
            client.post(endpoint, json=config | {"label_column_id": "missing"}).status_code == 422
        )
        board = client.post(
            f"/api/v1/projects/{project['id']}/dashboards", json={"name": "Equipment"}
        ).json()
        saved = client.put(
            f"/api/v1/dashboards/{board['id']}",
            json={
                "name": board["name"],
                "expected_revision": board["revision"],
                "widgets": [],
                "configuration": {
                    "parameters": [
                        {
                            "name": "equipment",
                            "logical_type": "integer",
                            "options": config | {"workflow_id": workflow["id"], "node_id": node_id},
                        }
                    ]
                },
            },
        )
        assert saved.status_code == 200, saved.text
        restored = client.get(f"/api/v1/dashboards/{board['id']}").json()
        assert restored["configuration"]["parameters"][0]["options"]["label_column_id"] == "col_2"
    finally:
        app.dependency_overrides.clear()
