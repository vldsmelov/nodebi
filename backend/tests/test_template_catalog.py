"""Catalog metadata must never mutate immutable calculations or existing reports."""

from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.models import ReportDocument
from app.schemas.template_catalog import TemplateCatalogEdit
from app.services.source_updates import state_token
from app.services.template_catalog import (
    TemplateCatalogService,
    freeze_template_catalog,
    restore_template_catalog,
)
from tests.test_analytical_templates import saved as analytical_saved
from tests.test_report_templates import saved as report_saved
from tests.test_sources_api import create_project


def example(db_engine, tmp_path, family="report"):
    if family == "report":
        client, root, body, ids, view, capture = report_saved(db_engine, tmp_path)
        names = {c["display_name"]: c["column_id"] for c in view["columns"]}
    else:
        client, root, body, profile, ids, capture = analytical_saved(
            db_engine, tmp_path, "histogram"
        )
        names = {f["name"]: f["field_id"] for f in profile["fields"]}
    path = root + f"/{family}-templates"
    response = client.post(path, json=capture)
    assert response.status_code == 200, response.text
    template = response.json()
    prepare = {k: body[k] for k in ("source_id", "resource_id", "expected_snapshot_id")}
    prepare.update(
        request_id=str(uuid4()),
        acknowledge_grain=True,
        mapping={f["key"]: names[f["name"]] for f in template["fields"]},
        expected_template_revision=1,
    )
    return client, root, ids, capture, template, prepare


def edit(client, root, template_id, revision, **change):
    return client.patch(
        root + f"/template-catalog/{template_id}",
        json={"request_id": str(uuid4()), "expected_revision": revision, **change},
    )


@pytest.mark.parametrize("family", ["analytical", "report"])
def test_rename_archive_restore_preserves_definition_receipt_and_reports(
    db_engine, tmp_path, family
):
    client, root, ids, capture, template, prepare = example(db_engine, tmp_path, family)
    path = root + f"/{family}-templates"
    prepare_url = path + f"/{template['id']}/prepare"
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    result_url = f"/api/v1/visualizations/{ids['visualization_id']}/result"
    graph = client.get(graph_url).json()
    result = client.post(result_url, json={}).json()
    with Session(db_engine) as session:
        original = deepcopy(session.get(ReportDocument, UUID(template["id"])).payload)
    renamed = edit(client, root, template["id"], 1, name="  Выручка по отделам  ")
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["name"] == "Выручка по отделам"
    assert renamed.json()["revision"] == 2
    assert client.get(path).json()["items"][0]["name"] == "Выручка по отделам"
    assert client.post(path, json=capture).json() == template
    assert client.post(prepare_url, json=prepare).status_code == 409
    assert (
        client.post(prepare_url, json={**prepare, "expected_template_revision": 2}).status_code
        == 200
    )
    legacy_prepare = {k: v for k, v in prepare.items() if k != "expected_template_revision"}
    assert client.post(prepare_url, json=legacy_prepare).status_code == 200
    archived = edit(client, root, template["id"], 2, archived=True)
    assert archived.status_code == 200
    assert archived.json()["revision"] == 3
    assert client.get(path).json()["items"] == []
    rejected = client.post(prepare_url, json=legacy_prepare)
    assert rejected.status_code == 409
    assert rejected.json()["detail"]["code"] == "TEMPLATE_ARCHIVED"
    page = client.get(root + "/template-catalog?state=archived").json()
    assert page["items"] == [archived.json()]
    assert (page["active_count"], page["archived_count"]) == (0, 1)
    restored = edit(client, root, template["id"], 3, archived=False)
    assert restored.json()["revision"] == 4
    assert (
        client.post(prepare_url, json={**prepare, "expected_template_revision": 4}).status_code
        == 200
    )
    assert client.get(graph_url).json() == graph
    assert client.post(result_url, json={}).json() == result
    with Session(db_engine) as session:
        payload = session.get(ReportDocument, UUID(template["id"])).payload
        assert {k: v for k, v in payload.items() if k != "catalog"} == original


def test_catalog_receipts_are_exact_and_revision_conflicts_do_not_write(db_engine, tmp_path):
    client, root, _, _, template, _ = example(db_engine, tmp_path)
    project_id = UUID(root.rsplit("/", 1)[-1])
    with Session(db_engine) as session:
        original_token = state_token(session, project_id)
    url = root + f"/template-catalog/{template['id']}"
    request = {"request_id": str(uuid4()), "expected_revision": 1, "name": "First name"}
    first = client.patch(url, json=request)
    assert first.status_code == 200
    second = edit(client, root, template["id"], 2, name="Latest name", archived=True)
    assert second.status_code == 200
    with Session(db_engine) as session:
        changed_token = state_token(session, project_id)
        assert changed_token != original_token
    assert client.patch(url, json=request).json() == first.json()
    assert client.patch(url, json={**request, "name": "Different"}).status_code == 409
    assert edit(client, root, template["id"], 1, archived=False).status_code == 409
    assert client.get(root + "/template-catalog?state=all").json()["items"] == [second.json()]
    assert client.patch(root + f"/template-catalog/{uuid4()}", json=request).status_code == 409
    assert edit(client, root, str(uuid4()), 1, name="Missing").status_code == 404
    foreign = f"/api/v1/projects/{create_project(db_engine)}"
    assert edit(client, foreign, template["id"], 3, name="Foreign").status_code == 404
    assert (
        client.patch(foreign + f"/template-catalog/{template['id']}", json=request).status_code
        == 409
    )
    noop = edit(client, root, template["id"], 3, name="Latest name", archived=True)
    assert noop.json() == second.json()
    with Session(db_engine) as session:
        assert state_token(session, project_id) == changed_token


def test_catalog_filter_pagination_and_shared_archive_limit(db_engine, tmp_path):
    client, root, _, capture, template, _ = example(db_engine, tmp_path)
    with Session(db_engine) as session:
        row = session.get(ReportDocument, UUID(template["id"]))
        for index in range(199):
            session.add(
                ReportDocument(
                    project_id=row.project_id,
                    kind=row.kind,
                    status="archived" if index % 2 else "saved",
                    payload={**deepcopy(row.payload), "catalog": {"name": f"Выручка {index:03}"}},
                )
            )
        session.commit()
    page = client.get(
        root + "/template-catalog", params={"q": "ВЫРУЧКА", "state": "all", "limit": 2, "offset": 1}
    ).json()
    assert page["total"] == 199
    assert [item["name"] for item in page["items"]] == ["Выручка 001", "Выручка 002"]
    assert (page["active_count"], page["archived_count"]) == (101, 99)
    assert client.get(root + "/template-catalog?family=analytical&state=all").json()["total"] == 0
    assert client.get(root + "/template-catalog?q=observation&state=all").json()["total"] == 200
    assert client.get(root + "/template-catalog?limit=101").status_code == 422
    assert client.get(root + "/template-catalog?offset=-1").status_code == 422
    assert client.get(root + "/template-catalog?state=deleted").status_code == 422
    assert client.get(root + "/template-catalog", params={"q": "a" * 201}).status_code == 422
    current = client.get(root + "/report-builder/" + capture["visualization_id"]).json()
    rejected = client.post(
        root + "/report-templates",
        json={**capture, "request_id": str(uuid4()), "expected_token": current["expected_token"]},
    )
    assert rejected.status_code == 422, rejected.text


@pytest.mark.parametrize(
    "change", [{}, {"name": "  "}, {"name": "x" * 201}, {"unexpected": True}, {"archived": "false"}]
)
def test_catalog_rejects_invalid_actions(db_engine, tmp_path, change):
    client, root, _, _, template, _ = example(db_engine, tmp_path)
    assert edit(client, root, template["id"], 1, **change).status_code == 422
    assert client.get(root + "/template-catalog").json()["items"][0]["revision"] == 1


@pytest.mark.parametrize("family", ["analytical", "report"])
def test_release_restores_catalog_metadata_with_fresh_ids(db_engine, tmp_path, family):
    client, root, ids, _, template, _ = example(db_engine, tmp_path, family)
    assert (
        edit(client, root, template["id"], 1, name="Archived reusable", archived=True).status_code
        == 200
    )
    client.post(root + "/checks")
    check = client.get(root + "/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    frozen = client.post(
        root + "/releases",
        json={
            "name": "Catalog release",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert frozen.status_code == 200, frozen.text
    release = client.get(root + "/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored catalog"}
    )
    assert restored.status_code == 200, restored.text
    target = f"/api/v1/projects/{restored.json()['id']}"
    items = client.get(target + "/template-catalog?state=all").json()["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Archived reusable"
    assert items[0]["archived"] and items[0]["revision"] == 1
    assert items[0]["id"] != template["id"]
    assert client.get(target + f"/{family}-templates").json()["items"] == []
    assert edit(client, target, items[0]["id"], 1, archived=False).status_code == 200
    assert (
        client.get(target + f"/{family}-templates").json()["items"][0]["name"]
        == "Archived reusable"
    )


def test_legacy_release_catalog_and_incomplete_metadata(db_engine, tmp_path):
    client, root, _, _, template, _ = example(db_engine, tmp_path)
    target = create_project(db_engine)
    with Session(db_engine) as session:
        content = freeze_template_catalog(session, UUID(root.rsplit("/", 1)[-1]))
        incomplete = {**content, "template_catalog": {}}
        with pytest.raises(ApplicationError, match="incomplete"):
            restore_template_catalog(session, target, incomplete)
        content.pop("template_catalog")
        restore_template_catalog(session, target, content)
        session.commit()
        restored = session.scalar(select(ReportDocument).where(ReportDocument.project_id == target))
        assert restored.status == "saved" and restored.revision == 1
        assert restored.payload["catalog"]["name"] == template["name"]


@pytest.mark.parametrize("same_request", [True, False])
def test_concurrent_catalog_edits_serialize(db_engine, tmp_path, same_request):
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent catalog edits require PostgreSQL")
    client, root, _, _, template, _ = example(db_engine, tmp_path)
    project_id = UUID(root.rsplit("/", 1)[-1])
    request_id = uuid4()
    barrier = Barrier(2)

    def write(index):
        with Session(db_engine) as session:
            request = TemplateCatalogEdit(
                request_id=request_id if same_request else uuid4(),
                expected_revision=1,
                name="Renamed",
            )
            barrier.wait(timeout=10)
            try:
                return (
                    TemplateCatalogService(session)
                    .edit(project_id, UUID(template["id"]), request)
                    .revision
                )
            except ApplicationError as exc:
                return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(write, [1, 2]))
    assert (
        outcomes == [2, 2] if same_request else set(outcomes) == {2, "TEMPLATE_REVISION_CONFLICT"}
    )
    assert client.get(root + "/template-catalog").json()["items"][0]["revision"] == 2
