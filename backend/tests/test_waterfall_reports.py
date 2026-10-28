from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Dashboard, ReportDocument, Visualization, Workflow
from tests.test_report_editing import save_workflow
from tests.test_sources_api import create_project, make_client


def example(
    db_engine,
    tmp_path,
    content=b"label,amount,kind,sequence\nTax,-2.30,change,3\nStart,10.10,initial,1\nRevenue,0.20,change,2\nEnd,8.00,total,4\n",
):
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}"
    source = client.post(
        root + "/imports", data={"connector": "csv"}, files={"file": ("bridge.csv", content)}
    ).json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    snapshot = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "request_id": str(uuid4()), "expected_revision": 1},
    )
    assert snapshot.status_code == 200, snapshot.text
    fields = {f["name"]: f["field_id"] for f in profile["fields"]}
    request = {
        "request_id": str(uuid4()),
        "source_id": source["id"],
        "resource_id": "table",
        "expected_snapshot_id": snapshot.json()["id"],
        "name": "Balance bridge",
        "analysis": {
            "type": "waterfall_steps",
            "category_column_id": fields["label"],
            "value_column_id": fields["amount"],
            "kind_column_id": fields["kind"],
            "order_column_id": fields["sequence"],
        },
    }
    return client, root, request, fields


def test_waterfall_create_edit_retry_and_reconciliation(db_engine, tmp_path):
    client, root, request, fields = example(db_engine, tmp_path)
    endpoint = root + "/statistical-reports"
    preview = client.post(endpoint + "/preview", json=request)
    assert preview.status_code == 200, preview.text
    data = preview.json()
    assert data["steps"] == ["dataset_source", "waterfall_steps"]
    assert [r["category"] for r in data["result"]["rows"]] == ["Start", "Revenue", "Tax", "End"]
    assert [r["balance"] for r in data["result"]["rows"]] == ["10.10", "10.30", "8.00", "8.00"]
    with Session(db_engine) as session:
        for model in (Workflow, Visualization, Dashboard, ReportDocument):
            assert not list(session.scalars(select(model)))
    saved = client.post(endpoint + "/apply", json=request)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    assert client.post(endpoint + "/apply", json=request).json() == ids
    changed = deepcopy(request)
    changed["analysis"]["order_column_id"] = None
    assert client.post(endpoint + "/apply", json=changed).status_code == 409
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    assert client.post(visual_url + "/result", json={}).json()["rows"] == data["result"]["rows"]
    edit_url = endpoint + "/" + ids["visualization_id"]
    read = client.get(edit_url).json()
    assert read["editable"], read
    assert read["settings"]["analysis"]["order_column_id"] == fields["sequence"]
    edit = {
        "request_id": str(uuid4()),
        "expected_token": read["expected_token"],
        "settings": read["settings"],
    }
    edit["settings"]["filters"] = [
        {"column_id": fields["label"], "operator": "not_equals", "value": "Revenue"}
    ]
    bad = client.post(edit_url + "/preview", json=edit)
    assert bad.status_code == 422, bad.text
    assert "differs from the running balance" in bad.text
    assert client.get(edit_url).json()["expected_token"] == read["expected_token"]
    edit["settings"]["filters"][0]["value"] = "End"
    edit["settings"]["analysis"].update(append_total=True, total_label="Forecast")
    updated = client.post(edit_url + "/preview", json=edit)
    assert updated.status_code == 200, updated.text
    assert updated.json()["result"]["rows"][-1]["category"] == "Forecast"
    assert updated.json()["result"]["rows"][-1]["balance"] == "8.00"
    assert client.post(edit_url + "/apply", json=edit).status_code == 200
    assert client.post(edit_url + "/apply", json=edit).status_code == 200
    assert (
        client.post(edit_url + "/apply", json={**edit, "request_id": str(uuid4())}).status_code
        == 409
    )
    live = client.post(visual_url + "/result", json={}).json()
    assert live["rows"] == updated.json()["result"]["rows"]
    assert live["spec"] == data["result"]["spec"]


@pytest.mark.parametrize(
    "mutation", ["missing_order", "input_order", "text_order", "missing_field", "double_total"]
)
def test_waterfall_invalid_configuration_is_atomic(db_engine, tmp_path, mutation):
    client, root, request, fields = example(db_engine, tmp_path)
    if mutation == "missing_order":
        del request["analysis"]["order_column_id"]
    elif mutation == "input_order":
        request["analysis"]["order_column_id"] = None
    elif mutation == "text_order":
        request["analysis"]["order_column_id"] = fields["kind"]
    elif mutation == "missing_field":
        request["analysis"]["order_column_id"] = "unavailable"
    else:
        request["analysis"]["append_total"] = True
    response = client.post(root + "/statistical-reports/apply", json=request)
    assert response.status_code == 422, response.text
    assert client.get(root + "/workflows").json()["items"] == []


def test_legacy_input_order_reopens_without_mutation_and_empty_filter_stays_empty(
    db_engine, tmp_path
):
    client, root, request, fields = example(
        db_engine,
        tmp_path,
        b"label,amount,kind,sequence\nStart,10.10,initial,1\nTax,-2.30,change,2\n",
    )
    request["analysis"]["order_column_id"] = None
    endpoint = root + "/statistical-reports"
    applied = client.post(endpoint + "/apply", json=request)
    assert applied.status_code == 200, applied.text
    ids = applied.json()
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    graph = client.get(graph_url).json()
    node = next(n for n in graph["nodes"] if n["type"] == "waterfall_steps")
    node["config"].pop("order_column_id", None)
    saved = save_workflow(client, graph)
    edit_url = endpoint + "/" + ids["visualization_id"]
    read = client.get(edit_url).json()
    assert read["editable"], read
    assert read["settings"]["analysis"]["order_column_id"] is None
    assert client.get(graph_url).json() == saved
    edit = {
        "request_id": str(uuid4()),
        "expected_token": read["expected_token"],
        "settings": read["settings"],
    }
    edit["settings"]["filters"] = [
        {"column_id": fields["label"], "operator": "equals", "value": "absent"}
    ]
    edit["settings"]["analysis"]["append_total"] = True
    preview = client.post(edit_url + "/preview", json=edit)
    assert preview.status_code == 200, preview.text
    assert preview.json()["result"]["rows"] == []
    assert client.get(graph_url).json() == saved


def test_waterfall_release_restore_and_template_remap_all_roles(db_engine, tmp_path):
    client, root, request, fields = example(db_engine, tmp_path)
    saved = client.post(root + "/statistical-reports/apply", json=request)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    read = client.get(root + "/statistical-reports/" + ids["visualization_id"]).json()
    capture = client.post(
        root + "/analytical-templates",
        json={
            "request_id": str(uuid4()),
            "visualization_id": ids["visualization_id"],
            "expected_token": read["expected_token"],
            "name": "Reusable bridge",
            "input_grain": "One ordered contribution or total per row.",
        },
    )
    assert capture.status_code == 200, capture.text
    template = capture.json()
    assert {f["name"] for f in template["fields"]} == {"label", "amount", "kind", "sequence"}
    source = {key: request[key] for key in ("source_id", "resource_id", "expected_snapshot_id")}
    prepared = client.post(
        root + f"/analytical-templates/{template['id']}/prepare",
        json={
            **source,
            "request_id": str(uuid4()),
            "acknowledge_grain": True,
            "mapping": {f["key"]: fields[f["name"]] for f in template["fields"]},
        },
    )
    assert prepared.status_code == 200, prepared.text
    assert prepared.json()["analysis"]["kind_column_id"] == fields["kind"]
    assert prepared.json()["analysis"]["order_column_id"] == fields["sequence"]
    client.post(root + "/checks")
    check = client.get(root + "/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    freeze = client.post(
        root + "/releases",
        json={
            "name": "Bridge",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert freeze.status_code == 200, freeze.text
    release = client.get(root + "/releases").json()[0]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen = client.get(
        f"/api/v1/releases/{release['id']}/widgets/{board['widgets'][0]['id']}/result"
    ).json()
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored bridge"}
    )
    assert restored.status_code == 200, restored.text
    new_root = f"/api/v1/projects/{restored.json()['id']}"
    visual = client.get(new_root + "/visualizations").json()["items"][0]
    live = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert live.status_code == 200, live.text
    assert [r["balance"] for r in live.json()["rows"]] == [r["balance"] for r in frozen["rows"]]
    assert client.get(new_root + "/statistical-reports/" + visual["id"]).json()["editable"]
    assert (
        client.get(new_root + "/analytical-templates").json()["items"][0]["settings"]["analysis"][
            "type"
        ]
        == "waterfall_steps"
    )
