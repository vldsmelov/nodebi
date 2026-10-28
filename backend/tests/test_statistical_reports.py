import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Dashboard, ReportDocument, Visualization, Workflow
from tests.test_report_editing import save_workflow
from tests.test_report_inputs import prepared
from tests.test_sources_api import create_project, make_client


def imported(db_engine, tmp_path, kind="histogram", content=None):
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}"
    source = client.post(
        f"{root}/imports",
        data={"connector": "csv"},
        files={
            "file": (
                "observations.csv",
                content or b"group,value\nA,1.00\nA,2.00\nA,3.00\nA,4.00\nA,100.00\nB,\n",
            )
        },
    ).json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    snapshot = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "request_id": str(uuid.uuid4()), "expected_revision": 1},
    )
    assert snapshot.status_code == 200, snapshot.text
    request = {
        "request_id": str(uuid.uuid4()),
        "source_id": source["id"],
        "resource_id": "table",
        "expected_snapshot_id": snapshot.json()["id"],
        "name": "Distribution",
        "analysis": {"type": kind, "value_column_id": profile["fields"][1]["field_id"]},
    }
    if kind == "histogram":
        request["analysis"].update(bin_count=2, range_min="0", range_max="4")
    else:
        request["analysis"]["group_column_id"] = profile["fields"][0]["field_id"]
    return client, root, request, profile


@pytest.mark.parametrize("kind", ["histogram", "boxplot_stats"])
def test_statistics_preview_apply_retry_release_restore(db_engine, tmp_path, kind):
    client, root, request, _ = imported(db_engine, tmp_path, kind)
    preview = client.post(f"{root}/statistical-reports/preview", json=request)
    assert preview.status_code == 200, preview.text
    data = preview.json()
    assert data["steps"] == ["dataset_source", kind]
    if kind == "histogram":
        assert [row["count"] for row in data["result"]["rows"]] == [1, 3]
        summary = data["result"]["datasets"]["summary"]["rows"][0]
        assert (summary["input_count"], summary["missing_count"], summary["above_count"]) == (
            6,
            1,
            1,
        )
    else:
        summary = data["result"]["rows"]
        assert summary[0]["median"] == "3.0000"
        assert (summary[0]["q1"], summary[0]["q3"], summary[0]["upper_whisker"]) == (
            "2.0000",
            "4.0000",
            "4.0000",
        )
        assert summary[1]["count"] == 0 and summary[1]["missing_count"] == 1
        assert data["result"]["datasets"]["outliers"]["rows"][0]["value"] == "100.00"
    with Session(db_engine) as session:
        for model in (Workflow, Visualization, Dashboard, ReportDocument):
            assert not list(session.scalars(select(model)))
    saved = client.post(f"{root}/statistical-reports/apply", json=request)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert client.post(f"{root}/statistical-reports/apply", json=request).json() == ids
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == graph
    live = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert live.status_code == 200, live.text
    assert (
        client.post(
            f"/api/v1/visualizations/{ids['visualization_id']}/result", json={"offset": 10**40}
        ).status_code
        == 422
    )
    assert live.json()["datasets"] == data["result"]["datasets"]
    # This authoring path creates the ordinary objects consumed by releases/restoration.
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    freeze = client.post(
        f"{root}/releases",
        json={
            "name": "Frozen",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert freeze.status_code == 200, freeze.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    restored = client.post(f"/api/v1/releases/{release_id}/restore", json={"name": "Restored"})
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    # Stable group/point IDs are remapped; business values remain exact.
    for name, dataset in data["result"]["datasets"].items():

        def business(rows):
            return [{k: v for k, v in row.items() if not k.endswith("_id")} for row in rows]

        assert business(result.json()["datasets"][name]["rows"]) == business(dataset["rows"])
    assert (
        client.post(
            f"{root}/statistical-reports/apply", json={**request, "name": "Different"}
        ).status_code
        == 409
    )


def test_statistical_filters_are_before_full_population_and_paging(db_engine, tmp_path):
    content = ("group,value\n" + "A,0.00\n" * 1000 + "A,100.00\n" * 150 + "B,999.00\n").encode()
    client, root, request, profile = imported(db_engine, tmp_path, "boxplot_stats", content)
    request["filters"] = [
        {"column_id": profile["fields"][0]["field_id"], "operator": "equals", "value": "A"}
    ]
    first = client.post(f"{root}/statistical-reports/preview", json=request)
    assert first.status_code == 200, first.text
    data = first.json()
    assert data["steps"] == ["dataset_source", "filter", "boxplot_stats"]
    assert len(data["result"]["rows"]) == 1
    assert data["result"]["rows"][0]["count"] == 1150
    assert data["result"]["rows"][0]["outlier_count"] == 150
    assert len(data["result"]["datasets"]["outliers"]["rows"]) == 100
    second = client.post(f"{root}/statistical-reports/preview?outlier_offset=100", json=request)
    assert second.status_code == 200, second.text
    assert second.json()["result"]["rows"] == data["result"]["rows"]
    assert len(second.json()["result"]["datasets"]["outliers"]["rows"]) == 50
    assert (
        client.post(
            f"{root}/statistical-reports/preview?outlier_offset={10**40}", json=request
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"{root}/statistical-reports/preview?outlier_offset=-1", json=request
        ).status_code
        == 422
    )


@pytest.mark.parametrize("kind", ["histogram", "boxplot_stats"])
def test_prepared_statistics_preserve_branch_and_reject_stale_input(db_engine, tmp_path, kind):
    client, project, ids, _, original, path = prepared(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/statistical-reports"
    request = {
        "request_id": original["request_id"],
        "published_input": original["published_input"],
        "name": "Distribution",
        "analysis": {"type": kind, "value_column_id": original["measures"][0]["column_id"]},
    }
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    preview = client.post(f"{root}/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before
    before["name"] = "Changed elsewhere"
    changed = save_workflow(client, before)
    assert client.post(f"{root}/apply", json=request).status_code == 409
    request["published_input"]["expected_token"] = client.get(path).json()["expected_token"]
    applied = client.post(f"{root}/apply", json=request)
    assert applied.status_code == 200, applied.text
    assert applied.json()["workflow_id"] == ids["workflow_id"]
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert graph["nodes"][: len(changed["nodes"])] == changed["nodes"]
    assert len(graph["nodes"]) == len(changed["nodes"]) + 1
    assert graph["edges"][: len(changed["edges"])] == changed["edges"]
    assert client.post(f"{root}/apply", json=request).json() == applied.json()
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == graph


@pytest.mark.parametrize("invalid", ["field", "range", "bins", "snapshot", "source", "mixed_input"])
def test_invalid_statistical_request_never_persists(db_engine, tmp_path, invalid):
    client, root, request, profile = imported(db_engine, tmp_path)
    status = 422
    if invalid == "field":
        request["analysis"]["value_column_id"] = profile["fields"][0]["field_id"]
    elif invalid == "range":
        request["analysis"]["range_max"] = "0"
    elif invalid == "bins":
        request["analysis"]["bin_count"] = 201
    elif invalid == "snapshot":
        request["expected_snapshot_id"] = str(uuid.uuid4())
        status = 409
    elif invalid == "source":
        root = f"/api/v1/projects/{create_project(db_engine)}"
        status = 404
    else:
        request["published_input"] = {
            "workflow_id": str(uuid.uuid4()),
            "publication_id": str(uuid.uuid4()),
            "expected_token": "a" * 64,
        }
    response = client.post(f"{root}/statistical-reports/apply", json=request)
    assert response.status_code == status, response.text
    with Session(db_engine) as session:
        assert not list(session.scalars(select(Workflow)))
        assert not list(session.scalars(select(ReportDocument)))


def test_statistical_apply_failure_rolls_back_and_deleted_report_not_recreated(
    db_engine, tmp_path, monkeypatch
):
    from app.services import statistical_reports

    client, root, request, _ = imported(db_engine, tmp_path)
    original = statistical_reports.save_graph

    def fail(*args, **kwargs):
        original(*args, **kwargs)
        raise RuntimeError("injected after graph write")

    monkeypatch.setattr(statistical_reports, "save_graph", fail)
    with pytest.raises(RuntimeError, match="injected"):
        client.post(f"{root}/statistical-reports/apply", json=request)
    with Session(db_engine) as session:
        for model in (Workflow, Visualization, Dashboard, ReportDocument):
            assert not list(session.scalars(select(model)))
    monkeypatch.setattr(statistical_reports, "save_graph", original)
    saved = client.post(f"{root}/statistical-reports/apply", json=request)
    assert saved.status_code == 200, saved.text
    with Session(db_engine) as session:
        session.delete(session.get(Dashboard, uuid.UUID(saved.json()["dashboard_id"])))
        session.commit()
    assert client.post(f"{root}/statistical-reports/apply", json=request).status_code == 410
    changed = copy.deepcopy(request)
    changed["analysis"]["bin_count"] = 4
    assert client.post(f"{root}/statistical-reports/apply", json=changed).status_code == 409


def test_histogram_report_preserves_sub_float_exact_membership(db_engine, tmp_path):
    client, root, request, _ = imported(
        db_engine,
        tmp_path,
        content=b"group,value\nA,9007199254740993.11\nA,9007199254740993.12\nA,9007199254740993.13\n",
    )
    request["analysis"].update(
        range_min="9007199254740993.11", range_max="9007199254740993.13", bin_count=2
    )
    result = client.post(f"{root}/statistical-reports/preview", json=request)
    assert result.status_code == 200, result.text
    assert [row["count"] for row in result.json()["result"]["rows"]] == [1, 2]
    assert (
        result.json()["result"]["rows"][0]["interval"]
        == "[9007199254740993.11; 9007199254740993.12)"
    )


@pytest.mark.parametrize("same_request", [True, False])
def test_concurrent_statistical_apply_preserves_shared_graph(db_engine, tmp_path, same_request):
    from app.config import Settings
    from app.domain.errors import ApplicationError
    from app.infrastructure.storage import LocalStorageProvider
    from app.schemas.statistical_reports import StatisticalReportRequest
    from app.services.statistical_reports import StatisticalReportService

    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent statistical report writes require PostgreSQL")
    client, project, ids, _, original, _ = prepared(db_engine, tmp_path)
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    body = {
        "request_id": original["request_id"],
        "published_input": original["published_input"],
        "name": "Distribution",
        "analysis": {"type": "histogram", "value_column_id": original["measures"][0]["column_id"]},
    }
    barrier = Barrier(2)

    def write(index):
        with Session(db_engine) as session:
            service = StatisticalReportService(
                session,
                LocalStorageProvider(tmp_path),
                Settings(database_url="sqlite://", storage_root=tmp_path),
            )
            request = StatisticalReportRequest.model_validate(
                {**body, "request_id": body["request_id"] if same_request else str(uuid.uuid4())}
            )
            barrier.wait(timeout=10)
            try:
                return str(service.apply(uuid.UUID(project), request).visualization_id)
            except ApplicationError as exc:
                return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(write, [1, 2]))
    if same_request:
        assert outcomes[0] == outcomes[1] and outcomes[0] != "REPORT_INPUT_CONFLICT"
    else:
        assert outcomes.count("REPORT_INPUT_CONFLICT") == 1
    after = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert after["revision"] == before["revision"] + 1
    assert len(after["nodes"]) == len(before["nodes"]) + 1
    assert len(after["result_catalog"]["outputs"]) == 2
