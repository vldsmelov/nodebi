from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.datasets import ColumnSchema, DatasetSchema, LogicalType
from app.domain.errors import ApplicationError
from app.domain.exact_formulas import compile_exact_formula
from app.infrastructure.storage import LocalStorageProvider
from app.models import ReportDocument
from app.schemas.analytical_templates import TemplateCapture
from app.services.report_template_mapping import canonical_expression, rewrite_expression
from app.services.report_templates import ReportTemplateService
from tests.test_combo_reports import example as combo_example
from tests.test_radar_reports import example as radar_example
from tests.test_report_comparison import example as comparison_example
from tests.test_report_editing import example as legacy_example
from tests.test_report_formulas import example as formula_example


def saved(db_engine, tmp_path, kind="combo"):
    if kind == "comparison":
        client, root, body = comparison_example(db_engine, tmp_path)
        project = root.rsplit("/", 1)[-1]
    elif kind == "legacy":
        client, project, _, body = legacy_example(db_engine, tmp_path)
    else:
        factory = {"combo": combo_example, "radar": radar_example, "formulas": formula_example}[
            kind
        ]
        client, project, body = factory(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}"
    created = client.post(root + "/report-builder/apply", json=body)
    assert created.status_code == 200, created.text
    ids = created.json()
    view = client.get(root + "/report-builder/" + ids["visualization_id"]).json()
    assert view["editable"], view
    capture = {
        "request_id": str(uuid4()),
        "visualization_id": ids["visualization_id"],
        "expected_token": view["expected_token"],
        "name": "Reusable report",
        "input_grain": "One original observation per row, preserve units and currency.",
    }
    return client, root, body, ids, view, capture


@pytest.mark.parametrize("kind", ["combo", "radar", "formulas", "legacy", "comparison"])
def test_capture_prepare_apply_preserves_exact_calculation_and_bindings(db_engine, tmp_path, kind):
    client, root, body, ids, view, capture = saved(db_engine, tmp_path, kind)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(graph_url).json()
    endpoint = root + "/report-templates"
    response = client.post(endpoint, json=capture)
    assert response.status_code == 200, response.text
    template = response.json()
    assert client.post(endpoint, json=capture).json() == template
    assert client.post(endpoint, json={**capture, "name": "Changed"}).status_code == 409
    assert client.post(endpoint, json={**capture, "request_id": str(uuid4())}).status_code == 409
    assert client.get(endpoint).json()["items"] == [template]
    # The statistical family keeps its original API and catalog.
    assert client.get(root + "/analytical-templates").json()["items"] == []
    names = {c["display_name"]: c["column_id"] for c in view["columns"]}
    request = {k: body[k] for k in ("source_id", "resource_id", "expected_snapshot_id")}
    request.update(
        request_id=str(uuid4()),
        acknowledge_grain=True,
        mapping={f["key"]: names[f["name"]] for f in template["fields"]},
    )
    prepare_url = endpoint + f"/{template['id']}/prepare"
    with Session(db_engine) as session:
        documents = list(session.scalars(select(ReportDocument.id)))
    prepared = client.post(prepare_url, json=request)
    assert prepared.status_code == 200, prepared.text
    settings = prepared.json()
    assert client.post(prepare_url, json=request).json() == settings
    assert client.get(graph_url).json() == before
    with Session(db_engine) as session:
        assert list(session.scalars(select(ReportDocument.id))) == documents
    old_outputs = {m.get("output_id") for m in body["measures"]}
    assert not old_outputs & {m["output_id"] for m in settings["measures"]}
    build = {
        **{k: v for k, v in request.items() if k not in {"mapping", "acknowledge_grain"}},
        **settings,
    }
    expected = client.post(root + "/report-builder/preview", json=body)
    actual = client.post(root + "/report-builder/preview", json=build)
    assert actual.status_code == 200, actual.text
    assert actual.json()["rows"] == expected.json()["rows"]
    applied = client.post(root + "/report-builder/apply", json=build)
    assert applied.status_code == 200, applied.text
    assert client.post(root + "/report-builder/apply", json=build).json() == applied.json()
    assert client.get(graph_url).json() == before
    output = client.post(
        f"/api/v1/visualizations/{applied.json()['visualization_id']}/result", json={}
    )
    assert output.status_code == 200, output.text
    assert output.json()["rows"] == actual.json()["rows"]
    assert client.get(root + "/report-builder/" + applied.json()["visualization_id"]).json()[
        "editable"
    ]


@pytest.mark.parametrize("mutation", ["grain", "missing", "duplicate", "type", "snapshot"])
def test_prepare_rejects_incompatible_inputs_without_writes(db_engine, tmp_path, mutation):
    client, root, body, ids, view, capture = saved(db_engine, tmp_path)
    template = client.post(root + "/report-templates", json=capture).json()
    names = {c["display_name"]: c["column_id"] for c in view["columns"]}
    request = {k: body[k] for k in ("source_id", "resource_id", "expected_snapshot_id")}
    request.update(
        request_id=str(uuid4()),
        acknowledge_grain=True,
        mapping={f["key"]: names[f["name"]] for f in template["fields"]},
    )
    keys = list(request["mapping"])
    if mutation == "grain":
        request["acknowledge_grain"] = False
    elif mutation == "missing":
        request["mapping"].pop(keys[0])
    elif mutation == "duplicate":
        request["mapping"][keys[0]] = request["mapping"][keys[1]]
    elif mutation == "type":
        request["mapping"][keys[0]], request["mapping"][keys[1]] = (
            request["mapping"][keys[1]],
            request["mapping"][keys[0]],
        )
    else:
        request["expected_snapshot_id"] = str(uuid4())
    response = client.post(root + f"/report-templates/{template['id']}/prepare", json=request)
    assert response.status_code in {404, 409, 422}, response.text
    assert len(client.get(root + "/workflows").json()["items"]) == 1


def test_formula_aliases_literals_and_exact_numeric_tokens_are_not_substring_replaced():
    schema = DatasetSchema(
        (
            ColumnSchema("ab", "amount", "Amount", LogicalType.DECIMAL, False, {"scale": 2}),
            ColumnSchema("abc", "category", "Category", LogicalType.STRING, False),
        )
    )
    expression = "if_else(category == 'amount [ab] abc', amount + 9007199254740993.11, [ab])"
    canonical = canonical_expression(expression, schema)
    rewritten = rewrite_expression(canonical, {"ab": "field_1", "abc": "field_2"}.__getitem__)
    assert "'amount [ab] abc'" in rewritten
    assert "9007199254740993.11" in rewritten
    assert "[field_2]" in rewritten
    assert rewritten.count("[field_1]") == 2


def test_canonical_formula_keeps_language_constants_when_column_names_collide():
    schema = DatasetSchema(
        tuple(
            ColumnSchema(name, name, name, LogicalType.INTEGER, False)
            for name in ["True", "False", "None", "abs", "amount"]
        )
    )
    actual = canonical_expression("if_else(True, abs(amount), None)", schema)
    assert compile_exact_formula(actual, schema).referenced_columns == ("amount",)


@pytest.mark.parametrize("same_request", [True, False])
def test_concurrent_report_template_capture_uses_project_lock(db_engine, tmp_path, same_request):
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent report template capture requires PostgreSQL")
    client, root, _, _, _, capture = saved(db_engine, tmp_path)
    barrier = Barrier(2)

    def write(index):
        with Session(db_engine) as session:
            service = ReportTemplateService(
                session,
                LocalStorageProvider(tmp_path),
                Settings(database_url="sqlite://", storage_root=tmp_path),
            )
            request = TemplateCapture.model_validate(
                {**capture, "request_id": capture["request_id"] if same_request else str(uuid4())}
            )
            barrier.wait(timeout=10)
            try:
                return str(service.capture(UUID(root.rsplit("/", 1)[-1]), request).id)
            except ApplicationError as exc:
                return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(write, [1, 2]))
    if same_request:
        assert outcomes == [capture["request_id"], capture["request_id"]]
    else:
        assert outcomes.count("REPORT_EDIT_CONFLICT") == 1
    assert len(client.get(root + "/report-templates").json()["items"]) == 1


def test_template_new_source_and_release_restoration_are_source_independent(db_engine, tmp_path):
    client, root, body, ids, view, capture = saved(db_engine, tmp_path, "formulas")
    template = client.post(root + "/report-templates", json=capture).json()
    original = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    source = client.post(
        root + "/imports",
        data={"connector": "csv"},
        files={"file": ("new.csv", b"Budget,Team,Revenue\n4.00,X,1.00\n6.00,X,3.00\n")},
    ).json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    snapshot = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid4())},
    ).json()
    target = {f["name"]: f["field_id"] for f in profile["fields"]}
    original_names = [c["display_name"] for c in view["columns"]]
    renamed = dict(zip(original_names, ["Team", "Revenue", "Budget"], strict=True))
    request = {
        "request_id": str(uuid4()),
        "source_id": source["id"],
        "resource_id": "table",
        "expected_snapshot_id": snapshot["id"],
        "acknowledge_grain": True,
        "mapping": {f["key"]: target[renamed[f["name"]]] for f in template["fields"]},
    }
    mapped = client.post(root + f"/report-templates/{template['id']}/prepare", json=request)
    assert mapped.status_code == 200, mapped.text
    build = {
        **{k: v for k, v in request.items() if k not in {"mapping", "acknowledge_grain"}},
        **mapped.json(),
    }
    preview = client.post(root + "/report-builder/preview", json=build)
    assert preview.status_code == 200, preview.text
    row = preview.json()["rows"][0]
    assert row["Actual"] == "4.00"
    assert row["Plan"] == "10.00"
    assert row["Mean of ratios"] == "0.3750"
    assert row["Ratio of totals"] == "0.4000"
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == original
    client.post(root + "/checks")
    check = client.get(root + "/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    frozen = client.post(
        root + "/releases",
        json={
            "name": "Templates",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert frozen.status_code == 200, frozen.text
    release = client.get(root + "/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored templates"}
    )
    assert restored.status_code == 200, restored.text
    restored_root = f"/api/v1/projects/{restored.json()['id']}"
    restored_template = client.get(restored_root + "/report-templates").json()["items"][0]
    assert {k: v for k, v in restored_template.items() if k != "id"} == {
        k: v for k, v in template.items() if k != "id"
    }
    assert restored_template["id"] != template["id"]
    # Cross-project access fails even when the payload is otherwise compatible.
    assert (
        client.post(
            restored_root + f"/report-templates/{template['id']}/prepare", json=request
        ).status_code
        == 404
    )


def test_template_can_reuse_prepared_result_without_copying_upstream_graph(db_engine, tmp_path):
    client, root, body, ids, view, capture = saved(db_engine, tmp_path)
    template = client.post(root + "/report-templates", json=capture).json()
    source = client.get(
        root + f"/report-builder/inputs/{ids['workflow_id']}/{ids['publication_id']}"
    ).json()
    columns = {c["display_name"]: c["column_id"] for c in source["columns"]}
    mapping = {
        f["key"]: columns[{"actual": "Actual", "plan": "Plan"}.get(f["name"], f["name"])]
        for f in template["fields"]
    }
    request = {
        "request_id": str(uuid4()),
        "acknowledge_grain": True,
        "mapping": mapping,
        "published_input": {
            k: source[k] for k in ("workflow_id", "publication_id", "expected_token")
        },
    }
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(graph_url).json()
    url = root + f"/report-templates/{template['id']}/prepare"
    prepared = client.post(url, json=request)
    assert prepared.status_code == 200, prepared.text
    assert client.get(graph_url).json() == before
    applied = client.post(
        root + "/report-builder/apply",
        json={
            "request_id": request["request_id"],
            "published_input": request["published_input"],
            **prepared.json(),
        },
    )
    assert applied.status_code == 200, applied.text
    assert applied.json()["workflow_id"] == ids["workflow_id"]
    after = client.get(graph_url).json()
    assert after["nodes"][: len(before["nodes"])] == before["nodes"]
    assert len(after["nodes"]) == len(before["nodes"]) + 1
    assert client.post(url, json=request).status_code == 409


def test_template_families_share_the_project_catalog_limit(db_engine, tmp_path):
    client, root, _, _, _, capture = saved(db_engine, tmp_path)
    with Session(db_engine) as session:
        session.add_all(
            ReportDocument(
                project_id=UUID(root.rsplit("/", 1)[-1]),
                kind="report_template" if index < 100 else "analytical_template",
                status="saved",
                payload={},
            )
            for index in range(200)
        )
        session.commit()
    for family in ("report", "analytical"):
        response = client.post(root + f"/{family}-templates", json=capture)
        assert response.status_code == 422, response.text
        assert response.json()["detail"]["code"] == "TEMPLATE_LIMIT"


def test_both_template_families_coexist_without_cross_reading_settings(db_engine, tmp_path):
    client, root, body, _, _, capture = saved(db_engine, tmp_path)
    report = client.post(root + "/report-templates", json=capture)
    assert report.status_code == 200, report.text
    created = client.post(
        root + "/statistical-reports/apply",
        json={
            **{k: body[k] for k in ("source_id", "resource_id", "expected_snapshot_id")},
            "request_id": str(uuid4()),
            "name": "Distribution",
            "analysis": {"type": "histogram", "value_column_id": body["measures"][0]["column_id"]},
        },
    )
    assert created.status_code == 200, created.text
    visual = created.json()["visualization_id"]
    view = client.get(root + "/statistical-reports/" + visual).json()
    statistical = client.post(
        root + "/analytical-templates",
        json={
            **capture,
            "request_id": str(uuid4()),
            "visualization_id": visual,
            "expected_token": view["expected_token"],
        },
    )
    assert statistical.status_code == 200, statistical.text
    assert client.get(root + "/report-templates").json()["items"] == [report.json()]
    assert client.get(root + "/analytical-templates").json()["items"] == [statistical.json()]
