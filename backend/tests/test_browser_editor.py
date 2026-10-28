import uuid
from collections.abc import Iterator
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy.engine import Engine

from app.main import app
from tests.test_sources_api import create_project, make_client


@pytest.fixture
def editor(db_engine: Engine, tmp_path: Path) -> Iterator[tuple[TestClient, str, str, str]]:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    workbook = Workbook()
    sheet = workbook.active
    assert sheet is not None
    sheet.title = "Sales"
    sheet.append(["Code", "Quantity", "Price"])
    sheet.append(["0001", 2, 10.5])
    stream = BytesIO()
    workbook.save(stream)
    source = client.post(
        f"/api/v1/projects/{project}/sources/excel",
        files={"file": ("sales.xlsx", stream.getvalue())},
    ).json()["id"]
    flow = client.post(f"/api/v1/projects/{project}/workflows", json={"name": "Input"}).json()
    response = client.put(
        f"/api/v1/workflows/{flow['id']}",
        json={
            "name": "Input",
            "expected_revision": 1,
            "nodes": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "excel_source",
                    "version": 1,
                    "position": {"x": 0, "y": 0},
                    "config": {"source_id": source, "sheet_name": "Sales"},
                }
            ],
            "edges": [],
        },
    )
    assert response.status_code == 200
    update = client.post(
        f"/api/v1/projects/{project}/file-updates",
        json={"source_id": source, "request_id": str(uuid.uuid4()), "reuse_existing": True},
    ).json()
    assert update["file_exchange"]["template_available"] is False
    try:
        yield client, project, source, f"/api/v1/updates/{update['id']}"
    finally:
        client.close()
        app.dependency_overrides.clear()


def test_legacy_editor_stages_checks_and_applies_native_values(editor: tuple) -> None:
    client, project, source, root = editor
    page = client.get(root + "/editor").json()
    assert page["rows"][0]["values"] == ["0001", "2", "10.5"]
    workspace = client.get(root + "/editor/workspace").json()
    assert workspace["page"]["workbook"] is False
    assert workspace["sheets"][0]["rows"] == 1
    assert workspace["page"]["columns"][0]["name"] == "Code"
    assert client.get(root + "/editor/find", params={"resource": "Sales", "text": "0001"}).json()[
        "cells"
    ] == [{"row": 0, "column": 0}]
    payload = {
        "expected_revision": page["revision"],
        "request_id": str(uuid.uuid4()),
        "resource_id": "Sales",
        "cells": [{"row_id": "r:0", "column": 1, "value": "7"}],
    }
    saved = client.post(root + "/editor", json=payload).json()
    assert client.post(root + "/editor", json=payload).json()["revision"] == saved["revision"]
    assert client.put(root, json={"expected_revision": saved["revision"]}).status_code == 409
    preview = f"/api/v1/sources/{source}/sheets/Sales/preview"
    assert client.get(preview).json()["rows"][0]["col_2"] == 2
    action = {"expected_revision": saved["revision"], "request_id": str(uuid.uuid4())}
    prepared = client.post(root + "/editor/prepare", json=action).json()
    assert not prepared["browser_editor_pending"]
    assert client.post(root + "/editor/prepare", json=action).json() == prepared
    assert client.get(preview).json()["rows"][0]["col_2"] == 2
    checked = client.post(root + "/check", json={"expected_revision": prepared["revision"]})
    assert checked.status_code == 200
    update = client.get(f"/api/v1/projects/{project}/updates").json()[0]
    assert update["status"] == "checked" and update["check"]["issues"] == []
    assert (
        client.post(root + "/apply", json={"expected_revision": update["revision"]}).status_code
        == 200
    )
    assert client.get(preview).json()["rows"] == [{"col_1": "0001", "col_2": 7, "col_3": 10.5}]


def test_reuse_conflict_and_discard_do_not_overwrite_input(editor: tuple) -> None:
    client, project, source, root = editor
    reused = client.post(
        f"/api/v1/projects/{project}/file-updates",
        json={"source_id": source, "request_id": str(uuid.uuid4()), "reuse_existing": True},
    ).json()
    assert root.endswith(reused["id"])
    payload = {
        "expected_revision": reused["revision"],
        "request_id": str(uuid.uuid4()),
        "resource_id": "Sales",
        "cells": [{"row_id": "r:0", "column": 1, "value": "bad number"}],
    }
    saved = client.post(root + "/editor", json=payload).json()
    conflict = client.post(root + "/editor", json={**payload, "request_id": str(uuid.uuid4())})
    assert conflict.status_code == 409
    action = {"expected_revision": saved["revision"], "request_id": str(uuid.uuid4())}
    assert client.post(root + "/editor/prepare", json=action).status_code == 422
    discarded = client.post(root + "/editor/discard", json=action).json()
    assert not discarded["browser_editor_pending"]
    assert client.get(root + "/editor").json()["rows"][0]["values"][1] == "2"


def test_editor_rejects_unknown_rows_and_control_characters(editor: tuple) -> None:
    client, _project, _source, root = editor
    page = client.get(root + "/editor").json()
    for row, value, status in [("r:99", "3", 409), ("r:0", "\x01bad", 422)]:
        response = client.post(
            root + "/editor",
            json={
                "expected_revision": page["revision"],
                "request_id": str(uuid.uuid4()),
                "resource_id": "Sales",
                "cells": [{"row_id": row, "column": 0, "value": value}],
            },
        )
        assert response.status_code == status
    assert client.get(root + "/editor").json()["revision"] == page["revision"]
