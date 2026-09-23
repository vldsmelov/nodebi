from pathlib import Path
from uuid import uuid4

from sqlalchemy.engine import Engine
from test_workflows_api import client_for

from app.main import app


def test_preview_reports_full_join_counts_without_leaking_upstream_diagnostics(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Join report"}).json()
        source_ids = []
        for name in ("join-orders", "join-prices"):
            path = Path(__file__).resolve().parents[2] / "fixtures" / "excel" / f"{name}.xlsx"
            upload = client.post(
                f"/api/v1/projects/{project['id']}/sources/excel",
                files={
                    "file": (
                        path.name,
                        path.read_bytes(),
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    )
                },
            )
            assert upload.status_code == 201, upload.text
            source_ids.append(upload.json()["id"])
        flow = client.post(
            f"/api/v1/projects/{project['id']}/workflows", json={"name": "Sales"}
        ).json()
        ids = [str(uuid4()) for _ in range(4)]
        configs = [
            {"source_id": source_ids[0], "sheet_name": "Orders"},
            {"source_id": source_ids[1], "sheet_name": "Prices"},
            {"left_key": "col_1", "right_key": "col_1", "how": "inner"},
            {
                "name": "Revenue",
                "expression": f"[col_2] * [join_{ids[2].replace('-', '')}_right_col_2]",
            },
        ]
        body = {
            "name": "Sales",
            "format_version": 3,
            "expected_revision": flow["revision"],
            "nodes": [
                {
                    "id": id,
                    "type": kind,
                    "version": 1,
                    "position": {"x": 0, "y": 0},
                    "config": config,
                }
                for id, kind, config in zip(
                    ids,
                    ["excel_source", "excel_source", "join", "calculated_column"],
                    configs,
                    strict=True,
                )
            ],
            "edges": [
                {
                    "id": str(uuid4()),
                    "source_node_id": ids[source],
                    "source_port": "dataset",
                    "target_node_id": ids[target],
                    "target_port": port,
                }
                for source, target, port in [(0, 2, "left"), (1, 2, "right"), (2, 3, "input")]
            ],
        }
        flow_path = f"/api/v1/workflows/{flow['id']}"
        saved = client.put(flow_path, json=body)
        assert saved.status_code == 200, saved.text
        preview_path = f"{flow_path}/nodes/{ids[2]}/preview"
        preview = client.post(preview_path, json={"limit": 1}).json()
        assert preview["returned_rows"] == 1 and preview["total_rows"] == 2
        stats = preview["join_diagnostics"]
        assert stats["left_rows"] == 3 and stats["right_rows"] == 2
        assert stats["dropped_left_rows"] == 1 and stats["matched_left_rows"] == 2
        assert client.post(preview_path, json={"limit": 2}).json()["join_diagnostics"] == stats
        downstream = client.post(f"{flow_path}/nodes/{ids[3]}/preview", json={"limit": 1})
        assert downstream.status_code == 200, downstream.text
        assert "join_diagnostics" not in downstream.json()
        configs[2]["how"] = "left"
        body["expected_revision"] = saved.json()["revision"]
        saved = client.put(flow_path, json=body)
        assert saved.status_code == 200, saved.text
        changed = client.post(preview_path, json={"limit": 1}).json()
        assert changed["revision"] == saved.json()["revision"]
        assert changed["join_diagnostics"]["result_rows"] == 3
        assert changed["join_diagnostics"]["dropped_left_rows"] == 0
    finally:
        app.dependency_overrides.clear()
