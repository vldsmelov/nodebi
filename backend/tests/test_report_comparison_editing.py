import copy
import uuid

import pytest

from tests.test_report_comparison import example
from tests.test_report_editing import save_workflow


def editor(db_engine, tmp_path):
    client, root, body = example(db_engine, tmp_path)
    saved = client.post(f"{root}/report-builder/apply", json=body)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    url = f"{root}/report-builder/{ids['visualization_id']}"
    projection = client.get(url).json()
    assert projection["editable"], projection
    request = {
        "request_id": str(uuid.uuid4()),
        "expected_token": projection["expected_token"],
        "settings": projection["settings"],
    }
    return client, url, ids, request


def test_edit_calendar_preserves_identity_layout_and_retries(db_engine, tmp_path):
    client, url, ids, request = editor(db_engine, tmp_path)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(graph_url).json()
    dashboard_url = f"/api/v1/dashboards/{ids['dashboard_id']}"
    dashboard = client.get(dashboard_url).json()
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    config = client.get(visual_url).json()["config"]
    request["settings"]["comparison"].update(unit="quarter", name="Quarter change", ratio_scale=2)
    preview = client.post(f"{url}/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert [r["Attainment"] for r in preview.json()["rows"]] == ["2.7778", "4.0000"]
    assert preview.json()["rows"][1]["Quarter change · difference"] == "1.2222"
    assert client.get(graph_url).json() == before
    applied = client.post(f"{url}/apply", json=request)
    assert applied.status_code == 200, applied.text
    assert client.post(f"{url}/apply", json=request).json() == applied.json()
    after = client.get(graph_url).json()
    assert after["revision"] == before["revision"] + 1
    assert after["edges"] == before["edges"]
    assert after["result_catalog"] == before["result_catalog"]
    assert [(n["id"], n["position"], n["ui"]) for n in after["nodes"]] == [
        (n["id"], n["position"], n["ui"]) for n in before["nodes"]
    ]
    assert client.get(dashboard_url).json() == dashboard
    assert client.get(visual_url).json()["config"] == config
    assert client.post(f"{visual_url}/result", json={}).json()["rows"] == preview.json()["rows"]
    assert client.get(url).json()["settings"]["comparison"]["unit"] == "quarter"
    request["request_id"] = str(uuid.uuid4())
    assert client.post(f"{url}/apply", json=request).status_code == 409
    assert client.get(graph_url).json() == after


def test_remove_and_restore_comparison_requires_explicit_field_rebinding(db_engine, tmp_path):
    client, url, ids, request = editor(db_engine, tmp_path)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(graph_url).json()
    comparison = copy.deepcopy(request["settings"]["comparison"])
    request["settings"]["comparison"] = None
    refused = client.post(f"{url}/apply", json=request)
    assert refused.status_code == 422, refused.text
    assert client.get(graph_url).json() == before
    request["settings"]["rebind_fields"] = True
    removed = client.post(f"{url}/apply", json=request)
    assert removed.status_code == 200, removed.text
    graph = client.get(graph_url).json()
    assert not any(n["type"] in ("calendar_period", "period_comparison") for n in graph["nodes"])
    rows = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={}).json()[
        "rows"
    ]
    assert len(rows) == 4  # Raw dates, no hidden calendar bucketing after removal.
    projection = client.get(url).json()
    assert projection["editable"] and projection["settings"]["comparison"] is None
    request = {
        "request_id": str(uuid.uuid4()),
        "expected_token": projection["expected_token"],
        "settings": projection["settings"],
    }
    request["settings"]["comparison"] = comparison
    assert client.post(f"{url}/apply", json=request).status_code == 422
    request["settings"]["rebind_fields"] = True
    restored = client.post(f"{url}/apply", json=request)
    assert restored.status_code == 200, restored.text
    rows = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={}).json()[
        "rows"
    ]
    assert [r["Change · previous"] for r in rows] == [None, "2.5000", None]


def test_legacy_editor_cannot_silently_remove_comparison(db_engine, tmp_path):
    client, url, ids, request = editor(db_engine, tmp_path)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(graph_url).json()
    request["settings"].pop("comparison")
    for action in ("preview", "apply"):
        response = client.post(f"{url}/{action}", json=request)
        assert response.status_code == 409, response.text
    assert client.get(graph_url).json() == before


@pytest.mark.parametrize(
    "boundary", ["calendar_shared", "comparison_shared", "manual", "unit", "partitions"]
)
def test_incompatible_or_shared_steps_remain_graph_only(db_engine, tmp_path, boundary):
    client, url, ids, request = editor(db_engine, tmp_path)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    graph = client.get(graph_url).json()
    calendar = next(n for n in graph["nodes"] if n["type"] == "calendar_period")
    comparison = next(n for n in graph["nodes"] if n["type"] == "period_comparison")
    if boundary.endswith("shared"):
        shared = calendar if boundary == "calendar_shared" else comparison
        extra = {
            "id": str(uuid.uuid4()),
            "type": "sort",
            "version": 1,
            "position": {"x": 1, "y": 2},
            "config": {
                "keys": [
                    {"column_id": request["settings"]["dimensions"][0], "direction": "ascending"}
                ]
            },
        }
        graph["nodes"].append(extra)
        graph["edges"].append(
            {
                "id": str(uuid.uuid4()),
                "source_node_id": shared["id"],
                "source_port": "dataset",
                "target_node_id": extra["id"],
                "target_port": "input",
            }
        )
    elif boundary == "manual":
        graph["presentation"]["blocks"] = [
            {
                "id": str(uuid.uuid4()),
                "label": "Manual",
                "node_ids": [calendar["id"]],
                "position": {"x": 0, "y": 0},
                "inputs": [
                    {
                        "id": str(uuid.uuid4()),
                        "label": "Input",
                        "node_id": calendar["id"],
                        "port": "input",
                    }
                ],
                "outputs": [
                    {
                        "id": str(uuid.uuid4()),
                        "label": "Output",
                        "node_id": calendar["id"],
                        "port": "dataset",
                    }
                ],
            }
        ]
    elif boundary == "unit":
        calendar["config"]["unit"] = "quarter"
    else:
        comparison["config"]["partitions"] = [request["settings"]["dimensions"][0]]
    saved = save_workflow(client, graph)
    projection = client.get(url)
    assert projection.status_code == 200, projection.text
    assert not projection.json()["editable"]
    assert client.get(graph_url).json() == saved
