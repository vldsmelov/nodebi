from io import BytesIO
from pathlib import Path
from uuid import uuid4

from openpyxl import Workbook
from sqlalchemy.engine import Engine

from app.main import app
from tests.test_workflows_api import client_for


def test_real_excel_field_wires_schema_preview_and_restore(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Typed sales"}).json()
        workbook = Workbook()
        workbook.active.title = "Sales"
        workbook.active.append(["Quantity", "Price"])
        workbook.active.append([2, 10])
        workbook.active.append([3, 20])
        stream = BytesIO()
        workbook.save(stream)
        workbook.close()
        uploaded = client.post(
            f"/api/v1/projects/{project['id']}/sources/excel",
            files={"file": ("sales.xlsx", stream.getvalue())},
        )
        assert uploaded.status_code == 201, uploaded.text
        graph = client.post(
            f"/api/v1/projects/{project['id']}/workflows", json={"name": "Revenue"}
        ).json()
        path = f"/api/v1/workflows/{graph['id']}"
        source, multiply, append, total = [str(uuid4()) for _ in range(4)]
        configs = [
            (source, "excel_source", {"source_id": uploaded.json()["id"], "sheet_name": "Sales"}),
            (multiply, "field_arithmetic", {"operation": "multiply"}),
            (append, "append_field", {"name": "Revenue"}),
            (total, "field_sum", {}),
        ]
        nodes = [
            {
                "id": identifier,
                "type": kind,
                "version": 1,
                "position": {"x": 0, "y": 0},
                "config": config,
            }
            for identifier, kind, config in configs
        ]
        wires = [
            (source, "dataset", multiply, "a", "col_1"),
            (source, "dataset", multiply, "b", "col_2"),
            (source, "dataset", append, "table", None),
            (multiply, "value", append, "value", None),
            (append, "dataset", total, "table", None),
            (append, "dataset", total, "value", "calc_" + append.replace("-", "")),
        ]
        edges = [
            {
                "id": str(uuid4()),
                "source_node_id": origin,
                "source_port": output,
                "target_node_id": target,
                "target_port": port,
                "source_column_id": column,
            }
            for origin, output, target, port, column in wires
        ]
        payload = {"name": "Revenue", "nodes": nodes, "edges": edges, "expected_revision": 1}
        assert client.put(path, json=payload).status_code == 422
        saved = client.put(path, json={**payload, "format_version": 2})
        assert saved.status_code == 200, saved.text
        assert client.get(path).json() == saved.json()
        schema = client.get(path + "/schema").json()
        assert schema["valid"], schema
        schemas = {item["node_id"]: item for item in schema["nodes"]}
        assert schemas[multiply]["outputs"]["value"]["kind"] == "field"
        assert schemas[multiply]["outputs"]["value"]["row_context"]["node_id"] == source
        assert schemas[total]["outputs"]["value"]["kind"] == "scalar"
        preview = client.post(
            path + f"/nodes/{multiply}/preview", json={"output_port": "value", "limit": 100}
        )
        assert preview.status_code == 200, preview.text
        assert preview.json()["rows"] == [{"value": 20.0}]
        assert preview.json()["total_rows"] == 2 and preview.json()["truncated"]
        assert preview.json()["value_kind"] == "field" and preview.json()["revision"] == 2
        result = client.post(path + f"/nodes/{total}/preview", json={"output_port": "value"})
        assert result.status_code == 200, result.text
        assert result.json()["rows"] == [{"value": 80.0}]
        assert result.json()["value_kind"] == "scalar"
        bad = client.post(path + f"/nodes/{total}/preview", json={"output_port": "dataset"})
        assert bad.status_code == 422 and "INVALID_OUTPUT_PORT" in bad.text
        legacy = client.get("/api/v1/node-catalog").json()["items"]
        advanced = client.get("/api/v1/node-catalog?format_version=2").json()["items"]
        assert not any(item["type"] == "field_arithmetic" for item in legacy)
        assert any(item["type"] == "field_arithmetic" for item in advanced)

        # Discover a dynamic Pivot field through the same API used by selectors,
        # then persist a real downstream field connection to its stable ID.
        pivot = str(uuid4())
        nodes.append(
            {
                "id": pivot,
                "type": "pivot",
                "version": 1,
                "position": {"x": 0, "y": 0},
                "config": {
                    "index_column_id": "col_1",
                    "pivot_column_id": "col_2",
                    "value_column_id": "calc_" + append.replace("-", ""),
                    "operation": "sum",
                },
            }
        )
        edges.append(
            {
                "id": str(uuid4()),
                "source_node_id": append,
                "source_port": "dataset",
                "target_node_id": pivot,
                "target_port": "input",
            }
        )
        payload.update(expected_revision=2, format_version=2)
        assert client.put(path, json=payload).status_code == 200
        discovered = client.get(path + "/schema").json()
        assert discovered["valid"], discovered
        pivot_output = next(item for item in discovered["nodes"] if item["node_id"] == pivot)
        column = next(
            item
            for item in pivot_output["outputs"]["dataset"]["columns"]
            if item["engine_name"] == "pivot_20"
        )
        for wire in edges:
            if wire["target_node_id"] == total:
                wire["source_node_id"] = pivot
                if wire["target_port"] == "value":
                    wire["source_column_id"] = column["column_id"]
        payload["expected_revision"] = 3
        saved = client.put(path, json=payload)
        assert saved.status_code == 200, saved.text
        assert client.get(path).json() == saved.json()
        result = client.post(path + f"/nodes/{total}/preview", json={"output_port": "value"})
        assert result.status_code == 200, result.text
        assert result.json()["rows"] == [{"value": 60.0}]
        assert result.json()["revision"] == 4
        # Parameterized schema requests validate context without changing revision.
        parameterized = client.post(path + "/schema", json={"parameters": {}})
        assert parameterized.status_code == 200 and parameterized.json()["valid"]
        assert parameterized.json()["revision"] == 4
        invalid = client.post(path + "/schema", json={"parameters": {"undeclared": 10}})
        assert invalid.status_code == 422
        assert client.get(path).json() == saved.json()
        filtered = str(uuid4())
        nodes.append(
            {
                "id": filtered,
                "type": "filter",
                "version": 1,
                "position": {"x": 0, "y": 0},
                "config": {
                    "conditions": [
                        {"column_id": "col_2", "operator": "equals", "parameter": "price"}
                    ]
                },
            }
        )
        for wire in edges:
            if wire["target_node_id"] == pivot:
                wire["source_node_id"] = filtered
        edges.append(
            {
                "id": str(uuid4()),
                "source_node_id": append,
                "source_port": "dataset",
                "target_node_id": filtered,
                "target_port": "input",
            }
        )
        payload.update(
            expected_revision=4,
            parameters=[{"name": "price", "logical_type": "integer", "default": 20}],
        )
        saved = client.put(path, json=payload)
        assert saved.status_code == 200, saved.text
        for price in (20, 10, 20):
            response = client.post(path + "/schema", json={"parameters": {"price": price}})
            assert response.status_code == 200, response.text
            body = response.json()
            output = next(item for item in body["nodes"] if item["node_id"] == pivot)
            assert [item["engine_name"] for item in output["columns"]] == [
                "Quantity",
                f"pivot_{price}",
            ]
            assert body["valid"] is (price == 20)
            assert body["revision"] == 5
        assert client.get(path).json() == saved.json()
    finally:
        app.dependency_overrides.clear()
