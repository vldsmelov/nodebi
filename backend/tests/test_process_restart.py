"""Real process replacement: no in-process cache or TestClient survives this acceptance."""

import json
import os
import subprocess
import time
import uuid

import pytest

from scripts.acceptance_process import process_client
from scripts.executive_demo import DemoProject, create_demo, verify_financials
from tests.test_executive_demo import check_statistics


def docker(*args):
    return subprocess.run(
        ["docker", *args], capture_output=True, text=True, check=True, timeout=45
    ).stdout.strip()


@pytest.fixture(params=["sqlite", "postgresql"])
def restart_environment(request, tmp_path):
    if request.param == "sqlite":
        yield lambda: process_client(tmp_path), lambda: None
        return
    if os.getenv("NODEBI_TEST_DOCKER_RESTART") != "1":
        pytest.skip("Opt in to owned Docker PostgreSQL restart with NODEBI_TEST_DOCKER_RESTART=1")
    name = "nodebi-restart-" + uuid.uuid4().hex
    # No configured/user database URL is accepted. The image's anonymous volume survives
    # restart and is removed with this owned --rm container; no host paths are mounted.
    identity = docker(
        "run",
        "--detach",
        "--rm",
        "--pull=never",
        "--name",
        name,
        "--label",
        f"nodebi.restart-owner={name}",
        "--publish",
        "127.0.0.1::5432",
        "--env",
        "POSTGRES_USER=nodebi_test",
        "--env",
        "POSTGRES_PASSWORD=acceptance_only",
        "--env",
        "POSTGRES_DB=nodebi_test",
        "postgres:17-alpine",
    )

    def state():
        details = json.loads(docker("inspect", identity))[0]
        assert details["Config"]["Labels"]["nodebi.restart-owner"] == name
        assert details["Id"] == identity
        return details

    def ready():
        deadline = time.monotonic() + 30
        while True:
            result = subprocess.run(
                [
                    "docker",
                    "exec",
                    identity,
                    "pg_isready",
                    "-U",
                    "nodebi_test",
                    "-d",
                    "nodebi_test",
                ],
                capture_output=True,
                timeout=5,
            )
            if result.returncode == 0:
                return
            assert time.monotonic() < deadline, "Owned PostgreSQL did not become ready"
            time.sleep(0.1)

    try:
        ready()

        def connect():
            # Docker may allocate a different ephemeral host port after restart.
            port = state()["NetworkSettings"]["Ports"]["5432/tcp"][0]["HostPort"]
            url = (
                "postgresql+psycopg://nodebi_test:acceptance_only@127.0.0.1:"
                f"{port}/nodebi_test?connect_timeout=5"
            )
            return process_client(tmp_path, database_url=url)

        def restart():
            before = state()["State"]["StartedAt"]
            docker("restart", identity)
            ready()
            assert state()["State"]["StartedAt"] != before

        yield connect, restart
    finally:
        state()  # Verify ownership again before removing the disposable database.
        docker("stop", identity)


def completed_job(client, root, response):
    assert response.status_code == 200, response.text
    identity = response.json()["id"]
    deadline = time.monotonic() + 20
    while True:
        jobs = client.get(root + "/report-jobs").json()
        job = next(item for item in jobs if item["id"] == identity)
        if job["status"] not in {"queued", "running"}:
            assert job["status"] == "succeeded", job
            return job
        assert time.monotonic() < deadline, job
        time.sleep(0.05)


def test_executive_financials_statistics_and_frozen_release_survive_process_replacement(
    restart_environment,
):
    connect, restart_database = restart_environment
    with connect() as client:
        demo = create_demo(client)
        root = f"/api/v1/projects/{demo.project_id}"
        verify_financials(client, demo)
        check_statistics(client, demo)
        dashboards = client.get(root + "/dashboards").json()
        workflows = client.get(root + "/workflows").json()
        datasets = client.get(root + "/datasets").json()
        original_names = {
            item["id"]: item["name"]
            for item in client.get(root + "/visualizations").json()["items"]
        }
        check = completed_job(client, root, client.post(root + "/checks"))
        completed_job(
            client,
            root,
            client.post(
                root + "/releases",
                json={
                    "name": "Before process restart",
                    "period": "2026",
                    "dashboard_ids": [demo.dashboard_id],
                    "expected_token": check["check"]["token"],
                },
            ),
        )
        release = client.get(root + "/releases").json()[0]
        widgets = dashboards["items"][0]["widgets"]
        widget_ids = {
            key: next(w["id"] for w in widgets if w["visualization_id"] == identity)
            for key, identity in demo.visualizations.items()
        }
        frozen = {}
        for key, identity in widget_ids.items():
            response = client.get(f"/api/v1/releases/{release['id']}/widgets/{identity}/result")
            assert response.status_code == 200, response.text
            frozen[key] = response.json()
    # No API process, sessions or execution cache survives. PostgreSQL is restarted too
    # when opted in; preserve its anonymous volume and the private source artifacts.
    restart_database()
    with connect() as client:
        assert client.get(root + "/dashboards").json() == dashboards
        assert client.get(root + "/workflows").json() == workflows
        assert client.get(root + "/datasets").json() == datasets
        verify_financials(client, demo)
        check_statistics(client, demo)
        for key, identity in widget_ids.items():
            assert (
                client.get(f"/api/v1/releases/{release['id']}/widgets/{identity}/result").json()
                == frozen[key]
            )
        restored = client.post(
            f"/api/v1/releases/{release['id']}/restore",
            json={"name": "Restored after process restart"},
        )
        assert restored.status_code == 200, restored.text
        target = f"/api/v1/projects/{restored.json()['id']}"
        restored_boards = client.get(target + "/dashboards").json()["items"]
        assert len(restored_boards) == 1 and len(restored_boards[0]["widgets"]) == 8
        assert restored_boards[0]["id"] != demo.dashboard_id
        restored_by_name = {
            item["name"]: item["id"]
            for item in client.get(target + "/visualizations").json()["items"]
        }
        assert set(restored_by_name) == set(original_names.values())
        restored_demo = DemoProject(
            project_id=restored.json()["id"],
            source_id=client.get(target + "/datasets").json()[0]["source_id"],
            dashboard_id=restored_boards[0]["id"],
            visualizations={
                key: restored_by_name[original_names[identity]]
                for key, identity in demo.visualizations.items()
            },
        )
        verify_financials(client, restored_demo)
        check_statistics(client, restored_demo)
