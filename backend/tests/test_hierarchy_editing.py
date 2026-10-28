"""Round-trip hierarchy editing must retain preparation, bindings and release semantics."""

import copy
import uuid

import pytest
from sqlalchemy.orm import Session

from app.models import Visualization
from tests.test_guided_profiles import example
from tests.test_report_editing import save_workflow


def editable(db_engine, tmp_path, kind):
    client, root, request, _ = example(db_engine, tmp_path, kind)
    response = client.post(f"{root}/statistical-reports/apply", json=request)
    assert response.status_code == 200, response.text
    ids = response.json()
    path = f"{root}/statistical-reports/{ids['visualization_id']}"
    view = client.get(path).json()
    assert view["editable"], view
    edit = {
        "request_id": str(uuid.uuid4()),
        "expected_token": view["expected_token"],
        "settings": view["settings"],
    }
    return client, root, ids, path, edit


@pytest.mark.parametrize("kind", ["treemap_chart", "sunburst_chart"])
def test_hierarchy_rebind_preserves_manual_graph_appearance_and_retry(db_engine, tmp_path, kind):
    client, root, ids, path, edit = editable(db_engine, tmp_path, kind)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    graph = client.get(graph_url).json()
    terminal = graph["nodes"][-1]
    manual = {
        "id": str(uuid.uuid4()),
        "type": "sort",
        "version": 1,
        "position": {"x": 200, "y": 200},
        "ui": {"label": "Manual preparation"},
        "config": {
            "keys": [
                {
                    "column_id": edit["settings"]["analysis"]["dimensions"][0],
                    "direction": "ascending",
                }
            ]
        },
    }
    edge = graph["edges"][0]
    graph["nodes"].append(manual)
    graph["edges"].append({**edge, "id": str(uuid.uuid4()), "target_node_id": manual["id"]})
    edge["source_node_id"] = manual["id"]
    before = save_workflow(client, graph)
    with Session(db_engine) as session:
        visual = session.get(Visualization, uuid.UUID(ids["visualization_id"]))
        visual.config = {
            **visual.config,
            "title": "Custom title",
            "show_legend": False,
            "show_labels": True,
        }
        session.commit()
    old_visual = client.get(visual_url).json()
    dashboard = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    edit["expected_token"] = client.get(path).json()["expected_token"]
    edit["settings"]["analysis"]["dimensions"].reverse()
    edit["settings"]["name"] = "Edited hierarchy"
    for action in ["preview", "apply"]:
        rejected = client.post(f"{path}/{action}", json=edit)
        assert rejected.status_code == 422, rejected.text
        assert "Confirm updating hierarchy" in rejected.text
        assert client.get(graph_url).json() == before
        assert client.get(visual_url).json() == old_visual
    edit["rebind_fields"] = True
    preview = client.post(f"{path}/preview", json=edit)
    assert preview.status_code == 200, preview.text
    assert preview.json()["result"]["hierarchy"]["total"] == "180.00"
    assert client.get(graph_url).json() == before
    applied = client.post(f"{path}/apply", json=edit)
    assert applied.status_code == 200, applied.text
    after = client.get(graph_url).json()
    assert [n for n in after["nodes"] if n["id"] != terminal["id"]] == [
        n for n in before["nodes"] if n["id"] != terminal["id"]
    ]
    assert after["edges"] == before["edges"]
    assert after["result_catalog"] == before["result_catalog"]
    expected_config = copy.deepcopy(old_visual["config"])
    expected_config["spec"]["dimensions"].reverse()
    assert client.get(visual_url).json()["config"] == expected_config
    assert client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json() == dashboard
    assert (
        client.post(f"{visual_url}/result", json={}).json()["hierarchy"]
        == preview.json()["result"]["hierarchy"]
    )
    assert client.post(f"{path}/apply", json=edit).json() == applied.json()
    assert client.get(graph_url).json() == after
    assert (
        client.post(f"{path}/apply", json={**edit, "request_id": str(uuid.uuid4())}).status_code
        == 409
    )
    # Frozen data and restored editable graphs retain the changed levels and exact amounts.
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    frozen = client.post(
        f"{root}/releases",
        json={
            "name": "Edited",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert frozen.status_code == 200, frozen.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored"})
    assert restored.status_code == 200, restored.text
    restored_root = f"/api/v1/projects/{restored.json()['id']}"
    restored_visual = client.get(f"{restored_root}/visualizations").json()["items"][0]
    view = client.get(f"{restored_root}/statistical-reports/{restored_visual['id']}").json()
    assert view["editable"] and view["settings"]["analysis"]["type"] == kind
    result = client.post(f"/api/v1/visualizations/{restored_visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["hierarchy"]["total"] == "180.00"


@pytest.mark.parametrize("kind", ["treemap_chart", "sunburst_chart"])
@pytest.mark.parametrize(
    "case",
    [
        "multiple_measures",
        "shared_publication",
        "unknown_config",
        "incomplete_totals",
        "wrong_binding",
    ],
)
def test_advanced_hierarchy_is_not_simplified(db_engine, tmp_path, kind, case):
    client, _, ids, path, edit = editable(db_engine, tmp_path, kind)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    graph = client.get(graph_url).json()
    if case == "multiple_measures":
        second = {
            **graph["nodes"][-1]["config"]["measures"][0],
            "output_id": str(uuid.uuid4()),
            "name": "Additional manual mean",
            "operation": "average",
        }
        graph["nodes"][-1]["config"]["measures"].append(second)
    elif case == "shared_publication":
        graph["result_catalog"]["outputs"].append(
            {**graph["result_catalog"]["outputs"][0], "id": str(uuid.uuid4()), "name": "Shared"}
        )
    elif case == "unknown_config":
        graph["nodes"][-1]["config"]["future_setting"] = True
    elif case == "incomplete_totals":
        graph["nodes"][-1]["config"]["subtotals"] = False
    else:
        with Session(db_engine) as session:
            visual = session.get(Visualization, uuid.UUID(ids["visualization_id"]))
            visual.config = {
                **visual.config,
                "spec": {**visual.config["spec"], "value_column_id": "unavailable"},
            }
            session.commit()
    before = save_workflow(client, graph)
    old_visual = client.get(visual_url).json()
    view = client.get(path).json()
    assert not view["editable"] and view["reason"]
    edit["expected_token"] = view["expected_token"]
    for action in ["preview", "apply"]:
        assert client.post(f"{path}/{action}", json=edit).status_code == 409
    assert client.get(graph_url).json() == before
    assert client.get(visual_url).json() == old_visual


@pytest.mark.parametrize("kind", ["treemap_chart", "sunburst_chart"])
def test_hierarchy_measure_identity_and_dangling_formats(db_engine, tmp_path, kind):
    client, _, ids, path, edit = editable(db_engine, tmp_path, kind)
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    # A new aggregation on the same logical measure retains its binding without rebind.
    measure = edit["settings"]["analysis"]["measures"][0]
    measure.update(operation="count_rows", column_id=None)
    before = client.get(visual_url).json()
    saved = client.post(f"{path}/apply", json=edit)
    assert saved.status_code == 200, saved.text
    assert client.get(visual_url).json()["config"] == before["config"]
    assert client.post(f"{visual_url}/result", json={}).json()["hierarchy"]["total"] == "3"
    # Replacing identity is explicit and cannot silently discard a format on the old measure.
    with Session(db_engine) as session:
        visual = session.get(Visualization, uuid.UUID(ids["visualization_id"]))
        field = visual.config["spec"]["value_column_id"]
        visual.config = {
            **visual.config,
            "column_formats": {field: {"style": "number", "decimals": 0}},
        }
        session.commit()
    read = client.get(path).json()
    assert read["editable"], read
    edit.update(
        request_id=str(uuid.uuid4()),
        expected_token=read["expected_token"],
        settings=read["settings"],
        rebind_fields=True,
    )
    edit["settings"]["analysis"]["measures"][0]["output_id"] = str(uuid.uuid4())
    graph_before = client.get(graph_url).json()
    visual_before = client.get(visual_url).json()
    response = client.post(f"{path}/apply", json=edit)
    assert response.status_code == 422, response.text
    assert client.get(graph_url).json() == graph_before
    assert client.get(visual_url).json() == visual_before
