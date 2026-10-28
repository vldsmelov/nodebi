import copy
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest

from app.schemas.statistical_reports import StatisticalSettings
from app.services.analytical_templates import rebind_settings, referenced_fields
from tests.test_analytical_reports import business_rows
from tests.test_analytical_reports import example as analytical_example
from tests.test_guided_profiles import example as profile_example
from tests.test_sources_api import create_project, make_client
from tests.test_statistical_reports import imported


def saved(db_engine, tmp_path, kind):
    if kind in {"heatmap_stats", "table_rollup"}:
        client, root, body, profile = analytical_example(db_engine, tmp_path, kind)
    elif kind in {"pareto", "funnel_steps", "treemap_chart", "sunburst_chart"}:
        client, root, body, profile = profile_example(db_engine, tmp_path, kind)
    else:
        client, root, body, profile = imported(db_engine, tmp_path, kind)
    response = client.post(f"{root}/statistical-reports/apply", json=body)
    assert response.status_code == 200, response.text
    ids = response.json()
    view = client.get(f"{root}/statistical-reports/{ids['visualization_id']}").json()
    capture = {
        "request_id": str(uuid.uuid4()),
        "visualization_id": ids["visualization_id"],
        "expected_token": view["expected_token"],
        "name": "Reusable analysis",
        "input_grain": "One prepared observation per row; preserve units.",
    }
    return client, root, body, profile, ids, capture


@pytest.mark.parametrize(
    "kind",
    [
        "histogram",
        "boxplot_stats",
        "heatmap_stats",
        "table_rollup",
        "pareto",
        "funnel_steps",
        "treemap_chart",
        "sunburst_chart",
    ],
)
def test_template_capture_mapping_and_regular_report_lifecycle(db_engine, tmp_path, kind):
    client, root, body, profile, ids, capture = saved(db_engine, tmp_path, kind)
    path = f"{root}/analytical-templates"
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    captured = client.post(path, json=capture)
    assert captured.status_code == 200, captured.text
    template = captured.json()
    assert client.post(path, json=capture).json() == template
    assert client.post(path, json={**capture, "name": "Different"}).status_code == 409
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before
    assert client.get(path).json()["items"] == [template]
    # Stored roles are source-independent; filenames/source/node identities are not template inputs.
    assert body["source_id"] not in json.dumps(template)
    names = {f["name"]: f["field_id"] for f in profile["fields"]}
    source = {k: body[k] for k in ["source_id", "resource_id", "expected_snapshot_id"]}
    request = {
        **source,
        "request_id": str(uuid.uuid4()),
        "acknowledge_grain": True,
        "mapping": {f["key"]: names[f["name"]] for f in template["fields"]},
    }
    resolved = client.post(f"{path}/{template['id']}/prepare", json=request)
    assert resolved.status_code == 200, resolved.text
    assert len(client.get(f"{root}/workflows").json()["items"]) == 1
    settings = resolved.json()
    assert settings["analysis"]["type"] == kind
    applied = client.post(
        f"{root}/statistical-reports/apply",
        json={**source, **settings, "request_id": request["request_id"]},
    )
    assert applied.status_code == 200, applied.text
    original = client.post(
        f"/api/v1/visualizations/{ids['visualization_id']}/result", json={}
    ).json()
    copied = client.post(
        f"/api/v1/visualizations/{applied.json()['visualization_id']}/result", json={}
    ).json()
    assert business_rows(copied) == business_rows(original)
    # Templates are detached: removing the source report does not erase the reusable definition.
    assert client.delete(f"/api/v1/workflows/{ids['workflow_id']}?confirm=true").status_code == 204
    assert client.post(f"{path}/{template['id']}/prepare", json=request).status_code == 200
    fresh = make_client(db_engine, tmp_path)
    assert fresh.get(path).json()["items"] == [template]


@pytest.mark.parametrize("case", ["missing", "extra", "same", "type", "grain", "stale", "foreign"])
def test_template_mapping_guards_do_not_write(db_engine, tmp_path, case):
    client, root, body, profile, ids, capture = saved(db_engine, tmp_path, "pareto")
    path = f"{root}/analytical-templates"
    template = client.post(path, json=capture).json()
    names = {f["name"]: f["field_id"] for f in profile["fields"]}
    mapping = {f["key"]: names[f["name"]] for f in template["fields"]}
    request = {k: body[k] for k in ["source_id", "resource_id", "expected_snapshot_id"]}
    request.update(request_id=str(uuid.uuid4()), mapping=mapping, acknowledge_grain=True)
    expected = 422
    if case == "missing":
        mapping.pop(next(iter(mapping)))
    elif case == "extra":
        mapping["invented"] = names["region"]
    elif case == "same":
        request["mapping"] = dict.fromkeys(mapping, names["value"])
    elif case == "type":
        request["mapping"] = {
            k: names["value"] if v == names["stage"] else names["stage"] for k, v in mapping.items()
        }
    elif case == "grain":
        request["acknowledge_grain"] = False
    elif case == "stale":
        request["expected_snapshot_id"] = str(uuid.uuid4())
        expected = 409
    else:
        other = str(create_project(db_engine))
        path = f"/api/v1/projects/{other}/analytical-templates"
        expected = 404
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    response = client.post(f"{path}/{template['id']}/prepare", json=request)
    assert response.status_code == expected, response.text
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before


def test_templates_survive_release_restoration(db_engine, tmp_path):
    client, root, _, _, ids, capture = saved(db_engine, tmp_path, "table_rollup")
    template = client.post(f"{root}/analytical-templates", json=capture).json()
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    frozen = client.post(
        f"{root}/releases",
        json={
            "name": "Templates",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert frozen.status_code == 200, frozen.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored templates"}
    )
    assert restored.status_code == 200, restored.text
    templates = client.get(f"/api/v1/projects/{restored.json()['id']}/analytical-templates").json()[
        "items"
    ]
    assert len(templates) == 1 and templates[0]["id"] != template["id"]
    expected = copy.deepcopy(template)
    expected["id"] = templates[0]["id"]
    assert templates[0] == expected


def test_rebinding_preserves_literal_filter_values_and_allocates_stable_output_ids():
    field = str(uuid.uuid4())
    settings = StatisticalSettings.model_validate(
        {
            "name": field,
            "analysis": {
                "type": "table_rollup",
                "dimensions": [field],
                "measures": [
                    {
                        "output_id": str(uuid.uuid4()),
                        "name": field,
                        "operation": "count_rows",
                    }
                ],
            },
            "filters": [{"column_id": field, "operator": "equals", "value": field}],
        }
    )
    namespace = uuid.uuid4()
    assert referenced_fields(settings) == [field]
    rebound = rebind_settings(settings, {field: "field_1"}, namespace)
    assert rebound.name == field and rebound.filters[0].value == field
    assert rebound.filters[0].column_id == "field_1"
    assert rebound == rebind_settings(settings, {field: "field_1"}, namespace)
    assert rebound != rebind_settings(settings, {field: "field_1"}, uuid.uuid4())


def test_capture_rejects_stale_state_and_mapping_uses_shared_prepared_branch(db_engine, tmp_path):
    client, root, body, profile, ids, capture = saved(db_engine, tmp_path, "pareto")
    path = f"{root}/analytical-templates"
    bad = {**capture, "expected_token": "0" * 64}
    assert client.post(path, json=bad).status_code == 409
    assert client.get(path).json()["items"] == []
    template = client.post(path, json=capture).json()
    # Build a normal prepared table, then bind the template to its output without copying it.
    source = {k: body[k] for k in ["source_id", "resource_id", "expected_snapshot_id"]}
    base = {
        **source,
        "request_id": str(uuid.uuid4()),
        "name": "Prepared categories",
        "dimensions": [profile["fields"][0]["field_id"]],
        "measures": [
            {
                "name": "Prepared amount",
                "operation": "sum",
                "column_id": profile["fields"][1]["field_id"],
            }
        ],
    }
    applied = client.post(f"{root}/report-builder/apply", json=base)
    assert applied.status_code == 200, applied.text
    prepared = applied.json()
    detail = client.get(
        f"{root}/report-builder/inputs/{prepared['workflow_id']}/{prepared['publication_id']}"
    ).json()
    columns = {c["display_name"]: c["column_id"] for c in detail["columns"]}
    mapping = {
        f["key"]: columns["stage" if f["name"] == "stage" else "Prepared amount"]
        for f in template["fields"]
    }
    request = {
        "request_id": str(uuid.uuid4()),
        "acknowledge_grain": True,
        "mapping": mapping,
        "published_input": {
            k: detail[k] for k in ["workflow_id", "publication_id", "expected_token"]
        },
    }
    url = f"/api/v1/workflows/{prepared['workflow_id']}"
    before = client.get(url).json()
    mapped = client.post(f"{path}/{template['id']}/prepare", json=request)
    assert mapped.status_code == 200, mapped.text
    assert client.get(url).json() == before
    reused = client.post(
        f"{root}/statistical-reports/apply",
        json={
            "request_id": request["request_id"],
            "published_input": request["published_input"],
            **mapped.json(),
        },
    )
    assert reused.status_code == 200, reused.text
    assert reused.json()["workflow_id"] == prepared["workflow_id"]
    assert client.get(url).json()["nodes"][:-1] == before["nodes"]
    assert client.post(f"{path}/{template['id']}/prepare", json=request).status_code == 409


def test_template_preserves_known_currency_and_rejects_incompatible_refresh(db_engine, tmp_path):
    client, root, body, profile, ids, capture = saved(db_engine, tmp_path, "histogram")

    def update(currency):
        source = next(
            s for s in client.get(f"{root}/imports").json() if s["id"] == body["source_id"]
        )
        profile["fields"][1].update(currency=currency, unit="money")
        response = client.post(
            f"/api/v1/imports/{body['source_id']}/apply",
            json={
                "profile": profile,
                "expected_revision": source["revision"],
                "request_id": str(uuid.uuid4()),
            },
        )
        assert response.status_code == 200, response.text
        return response.json()["id"]

    snapshot = update("RUB")
    capture["expected_token"] = client.get(
        f"{root}/statistical-reports/{ids['visualization_id']}"
    ).json()["expected_token"]
    path = f"{root}/analytical-templates"
    template = client.post(path, json=capture).json()
    assert template["fields"][0]["currency"] == "RUB"
    assert template["fields"][0]["unit"] == "money"
    request = {
        "source_id": body["source_id"],
        "resource_id": "table",
        "expected_snapshot_id": snapshot,
        "request_id": str(uuid.uuid4()),
        "mapping": {template["fields"][0]["key"]: profile["fields"][1]["field_id"]},
        "acknowledge_grain": True,
    }
    assert client.post(f"{path}/{template['id']}/prepare", json=request).status_code == 200
    request["expected_snapshot_id"] = update("USD")
    response = client.post(f"{path}/{template['id']}/prepare", json=request)
    assert response.status_code == 422 and "currency" in response.text


@pytest.mark.parametrize("same_request", [True, False])
def test_concurrent_template_capture_is_idempotent_or_revision_guarded(
    db_engine, tmp_path, same_request
):
    from sqlalchemy.orm import Session

    from app.config import Settings
    from app.domain.errors import ApplicationError
    from app.infrastructure.storage import LocalStorageProvider
    from app.schemas.analytical_templates import TemplateCapture
    from app.services.analytical_templates import AnalyticalTemplateService

    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent template capture requires PostgreSQL")
    client, root, _, _, _, capture = saved(db_engine, tmp_path, "histogram")
    barrier = Barrier(2)

    def write(index):
        with Session(db_engine) as session:
            service = AnalyticalTemplateService(
                session,
                LocalStorageProvider(tmp_path),
                Settings(database_url="sqlite://", storage_root=tmp_path),
            )
            request = TemplateCapture.model_validate(
                {
                    **capture,
                    "request_id": capture["request_id"] if same_request else str(uuid.uuid4()),
                }
            )
            barrier.wait(timeout=10)
            try:
                return str(service.capture(uuid.UUID(root.rsplit("/", 1)[-1]), request).id)
            except ApplicationError as exc:
                return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(write, [1, 2]))
    if same_request:
        assert outcomes == [capture["request_id"], capture["request_id"]]
    else:
        assert outcomes.count("REPORT_EDIT_CONFLICT") == 1
    assert len(client.get(f"{root}/analytical-templates").json()["items"]) == 1
