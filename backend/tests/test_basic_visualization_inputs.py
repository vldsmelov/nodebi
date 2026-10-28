from copy import deepcopy
from uuid import uuid4

import pytest
from pydantic import ValidationError
from test_basic_visualization_specs import request_for
from test_radar_visualizations import prepare
from test_report_editing import example
from test_visualization_save_receipts import setup_visualization  # noqa: F401

from app.schemas.dashboards import IndependentVisualizationSave


def request(config, kind="bar_chart"):
    return dict(
        workflow_id=uuid4(),
        publication_id=uuid4(),
        expected_workflow_revision=1,
        name="Typed",
        type=kind,
        config=config,
    )


@pytest.mark.parametrize(
    "config,kind",
    [
        ({"spec": {"type": "kpi", "value": "a"}}, "bar_chart"),
        ({"spec": {"type": "kpi", "value": "a"}, "value_column_id": "a"}, "kpi"),
        ({"spec": {"type": "table", "columns": ["a", "a"]}}, "table"),
        ({"spec": {"type": "table", "columns": [""]}}, "table"),
        ({"spec": {"type": "bar_chart", "x": "a", "y": []}}, "bar_chart"),
        ({"spec": {"type": "bar_chart", "x": "a", "y": [{"column_id": "b"}] * 2}}, "bar_chart"),
        (
            {
                "spec": {
                    "type": "area_chart",
                    "x": "a",
                    "y": [{"column_id": "b"}, {"column_id": "c"}],
                }
            },
            "area_chart",
        ),
        ({"spec": {"type": "kpi", "version": 2, "value": "a"}}, "kpi"),
    ],
)
def test_invalid_or_ambiguous_typed_inputs_are_rejected(config, kind):
    with pytest.raises(ValidationError):
        IndependentVisualizationSave.model_validate(request(config, kind))


def test_canonical_defaults_keep_legacy_receipts_and_all_columns_semantics():
    body = request({"value_column_id": "v", "category_column_id": "x"})
    legacy = IndependentVisualizationSave.model_validate(body)
    typed = IndependentVisualizationSave.model_validate(
        {
            **body,
            "config": {
                "spec": {"type": "bar_chart", "x": "x", "y": [{"column_id": "v"}]},
            },
        }
    )
    assert typed.model_dump(mode="json") == legacy.model_dump(mode="json")
    assert "primary_series_name" not in legacy.model_dump(mode="json")["config"]
    table = IndependentVisualizationSave.model_validate(
        request({"spec": {"type": "table"}}, "table")
    )
    assert table.config.column_ids is None
    assert "column_ids" in table.config.model_fields_set
    implicit = IndependentVisualizationSave.model_validate(request({"spec": {}}, "kpi"))
    assert implicit.config.value_column_id is None


def test_typed_save_retry_copy_appearance_and_invalid_fields_are_atomic(db_engine, tmp_path):
    client, root, _, ids, payload = prepare(db_engine, tmp_path)
    payload = request_for(payload, "bar_chart")
    preview = client.post(f"{root}/visualizations/preview", json=payload).json()
    spec = preview["spec"]
    spec["y"][0]["name"] = "Actual revenue"
    payload.update(config={"spec": spec, "decimals": 3}, request_id=str(uuid4()))
    before = deepcopy(payload)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    typed_preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert typed_preview.status_code == 200, typed_preview.text
    assert typed_preview.json()["rows"] == preview["rows"]
    assert typed_preview.json()["spec"] == spec
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    assert saved.json()["config"]["primary_series_name"] == "Actual revenue"
    assert "spec" not in saved.json()["config"]
    assert client.put(url, json=payload).json() == saved.json()
    assert payload == before
    changed = {**payload, "name": "Changed request"}
    assert client.put(url, json=changed).status_code == 409
    appearance = {
        **payload,
        "request_id": str(uuid4()),
        "expected_revision": 2,
        "config": {"title": "Appearance only"},
    }
    updated = client.put(url, json=appearance)
    assert updated.status_code == 200, updated.text
    assert client.put(url, json=appearance).json() == updated.json()
    assert client.post(f"{url}/result", json={}).json()["spec"] == spec
    copied = client.post(
        f"{url}/copy", json={**appearance, "request_id": str(uuid4()), "expected_revision": 3}
    )
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"] == updated.json()["config"]
    invalid = deepcopy(payload)
    invalid.update(request_id=str(uuid4()), expected_revision=3)
    invalid["config"]["spec"]["y"][0]["column_id"] = "missing"
    rejected = client.put(url, json=invalid)
    assert rejected.status_code == 422, rejected.text
    assert client.get(url).json() == updated.json()


def test_scalar_typed_kpi_uses_one_value_and_rejects_wrong_explicit_identity(
    setup_visualization,  # noqa: F811 - imported pytest fixture
):
    client, project_id, graph, body = setup_visualization
    url = f"/api/v1/projects/{project_id}/visualizations"
    typed = {**body, "config": {"spec": {"type": "kpi", "value": None}}}
    created = client.post(url, json=typed)
    assert created.status_code == 201, created.text
    assert client.post(url, json=typed).json() == created.json()
    result = client.post(f"/api/v1/visualizations/{created.json()['id']}/result", json={}).json()
    assert result["rows"][0][result["value_field"]] == 42
    expected_id = f"value_{graph['nodes'][0]['id'].replace('-', '')}"
    assert result["spec"]["value"] == expected_id
    rejected = client.post(
        url,
        json={
            **typed,
            "request_id": str(uuid4()),
            "config": {
                "spec": {"type": "kpi", "value": "wrong"},
            },
        },
    )
    assert rejected.status_code == 422, rejected.text


def test_wizard_can_edit_calculation_after_typed_visualization_save(db_engine, tmp_path):
    client, project, ids, _ = example(db_engine, tmp_path)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    visual = client.get(url).json()
    before = client.post(f"{url}/result", json={}).json()
    saved = client.put(
        url,
        json={
            "workflow_id": visual["workflow_id"],
            "publication_id": visual["publication_id"],
            "expected_workflow_revision": before["revision"],
            "expected_revision": visual["revision"],
            "name": visual["name"],
            "type": visual["type"],
            "config": {"spec": before["spec"], "title": "Preserved typed settings"},
        },
    )
    assert saved.status_code == 200, saved.text
    root = f"/api/v1/projects/{project}/report-builder/{visual['id']}"
    projection = client.get(root).json()
    assert projection["editable"], projection
    settings = projection["settings"]
    settings["measures"][0]["operation"] = "average"
    applied = client.post(
        f"{root}/apply",
        json={
            "request_id": str(uuid4()),
            "expected_token": projection["expected_token"],
            "settings": settings,
        },
    )
    assert applied.status_code == 200, applied.text
    after = client.post(f"{url}/result", json={}).json()
    assert after["rows"][0]["Revenue"] == "0.150000"
    assert after["spec"] == before["spec"]
    assert client.get(url).json()["config"] == saved.json()["config"]
