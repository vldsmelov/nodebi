from copy import deepcopy
from uuid import uuid4

import pytest

from tests.test_report_editing import example, save_workflow


@pytest.mark.parametrize("operation,version", [("union", 1), ("join", 1), ("join", 2)])
def test_exact_composition_preview_report_and_release_restore(
    db_engine, tmp_path, operation, version
):
    client, project, ids, body = example(db_engine, tmp_path)
    imported = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv"},
        files={"file": ("other.csv", b"category,amount\nA,0.10000001\n")},
    )
    assert imported.status_code == 201, imported.text
    source = imported.json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    applied = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid4())},
    )
    assert applied.status_code == 200, applied.text
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    left = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    right = deepcopy(left)
    right["id"] = str(uuid4())
    right["config"]["source_id"] = source["id"]
    graph["nodes"].append(right)
    combined = next(n for n in graph["nodes"] if n["type"] == "group_by")
    keys = {
        "left_key": body["measures"][0]["column_id"],
        "right_key": profile["fields"][1]["field_id"],
    }
    config = {}
    if operation == "join":
        config = (
            {**keys, "how": "left"}
            if version == 1
            else {"keys": [keys], "how": "left", "relationship": "one_to_one"}
        )
    combined.update(type=operation, version=version, config=config)
    edge = next(e for e in graph["edges"] if e["target_node_id"] == combined["id"])
    edge["target_port"] = "left"
    graph["edges"].append(
        {**edge, "id": str(uuid4()), "source_node_id": right["id"], "target_port": "right"}
    )
    # Normalized sources have independent stable engine IDs. Explicitly align names,
    # as required by the existing Union contract; never conflate source identities.
    for source_node, field_ids in (
        (left, [body["dimensions"][0], body["measures"][0]["column_id"]]),
        (right, [f["field_id"] for f in profile["fields"]]),
    ):
        rename_id = str(uuid4())
        graph["nodes"].append(
            {
                "id": rename_id,
                "type": "rename_columns",
                "version": 1,
                "position": {"x": 200, "y": 200},
                "config": {
                    "renames": [
                        {"column_id": field_id, "new_name": name}
                        for field_id, name in zip(field_ids, ["category", "amount"], strict=True)
                    ]
                },
            }
        )
        for branch in graph["edges"]:
            if branch["source_node_id"] == source_node["id"]:
                branch["source_node_id"] = rename_id
        graph["edges"].append(
            {
                "id": str(uuid4()),
                "source_node_id": source_node["id"],
                "source_port": "dataset",
                "target_node_id": rename_id,
                "target_port": "input",
            }
        )
    saved = save_workflow(client, graph)
    preview = client.post(
        f"/api/v1/workflows/{ids['workflow_id']}/nodes/{combined['id']}/preview", json={}
    )
    assert preview.status_code == 200, preview.text
    columns = preview.json()["columns"]
    assert next(c for c in columns if c["engine_name"] == "amount")["metadata"]["scale"] == 8
    if operation == "join":
        for kind, expected in (
            ("left_unmatched", ["0.10", "0.20", "0.50"]),
            ("right_unmatched", ["0.10000001"]),
            ("left_duplicates", []),
            ("right_duplicates", []),
        ):
            diagnostic = client.post(
                f"/api/v1/workflows/{ids['workflow_id']}/nodes/{combined['id']}/preview",
                json={"diagnostic": kind},
            )
            assert diagnostic.status_code == 200, diagnostic.text
            assert [row["amount"] for row in diagnostic.json()["rows"]] == expected
    visual = client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json()
    rebound = client.put(
        f"/api/v1/visualizations/{visual['id']}",
        json={
            "workflow_id": ids["workflow_id"],
            "publication_id": visual["publication_id"],
            "expected_workflow_revision": saved["revision"],
            "expected_revision": visual["revision"],
            "name": "Exact composition",
            "type": "table",
            "config": {"column_ids": [c["column_id"] for c in columns]},
        },
    )
    assert rebound.status_code == 200, rebound.text
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    rows = result.json()["rows"]
    assert [row["amount"] for row in rows] == (
        ["0.10000000", "0.20000000", "0.50000000", "0.10000001"]
        if operation == "union"
        else ["0.10000000", "0.20000000", "0.50000000"]
    )
    if operation == "join":
        assert all(row["amount__right"] is None for row in rows)
    root = f"/api/v1/projects/{project}"
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    created = client.post(
        f"{root}/releases",
        json={
            "name": "Exact composition",
            "period": "October",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
            "acknowledge_warnings": operation == "join",
        },
    )
    assert created.status_code == 200, created.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored composition"}
    )
    assert restored.status_code == 200, restored.text
    restored_visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()[
        "items"
    ][0]
    again = client.post(f"/api/v1/visualizations/{restored_visual['id']}/result", json={})
    assert again.status_code == 200, again.text
    assert again.json()["rows"] == rows
