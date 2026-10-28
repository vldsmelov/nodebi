"""Copy the private OPIOP project via APIs and legacy context-KPI application restoration.

Reads the original database in read-only transactions. Never migrates or edits it.
Requires existing nodebi-postgres-1 (running), nodebi-backend-1 (may be stopped),
and the demo API on localhost:8030. Source data is NOT bundled with this script.
Run once per demo database; use --resume-project with the printed ID after a partial failure.
"""

import argparse
import io
import json
import subprocess
import tarfile
import uuid
from pathlib import PurePosixPath
from typing import Any

import httpx

from scripts.executive_demo import call

PROJECT = "908f1522-f6cd-42e4-93e0-0a59ae0749e8"


def read(table: str, condition: str) -> list[dict[str, Any]]:
    allowed = {
        "data_sources",
        "workflows",
        "workflow_nodes",
        "workflow_edges",
        "visualizations",
        "dashboards",
        "dashboard_widgets",
    }
    if table not in allowed:
        raise ValueError("Unsupported source table")
    sql = (
        "BEGIN READ ONLY; SELECT coalesce(json_agg(t),'[]') "
        f"FROM (SELECT * FROM {table} WHERE {condition}) t; COMMIT;"
    )
    result = subprocess.run(
        [
            "docker",
            "exec",
            "nodebi-postgres-1",
            "psql",
            "-U",
            "nodebi",
            "-d",
            "nodebi",
            "-qAt",
            "-c",
            sql,
        ],
        check=True,
        capture_output=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def source_bytes(key: str) -> bytes:
    path = PurePosixPath(key)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("Unsafe source storage key")
    archive = subprocess.run(
        ["docker", "cp", f"nodebi-backend-1:/data/sources/{key}", "-"],
        check=True,
        capture_output=True,
    ).stdout
    with tarfile.open(fileobj=io.BytesIO(archive)) as package:
        files = [member for member in package.getmembers() if member.isfile()]
        if len(files) != 1:
            raise ValueError("Expected exactly one source file")
        content = package.extractfile(files[0])
        if content is None:
            raise ValueError("Source file is unavailable")
        return content.read()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--resume-project", type=uuid.UUID)
    args = parser.parse_args()
    condition = f"project_id='{PROJECT}'"
    sources = read("data_sources", condition)
    workflows = read("workflows", condition)
    visuals = read("visualizations", condition)
    boards = read("dashboards", condition)
    if not sources or not workflows or not boards or any(not v["publication_id"] for v in visuals):
        raise ValueError("Expected the published financial project with its source and dashboards")
    mapping: dict[str, str] = {}

    def remap(value: Any) -> Any:
        if isinstance(value, str):
            return mapping.get(value, value)
        if isinstance(value, list):
            return [remap(item) for item in value]
        if isinstance(value, dict):
            return {mapping.get(key, key): remap(item) for key, item in value.items()}
        return value

    with httpx.Client(base_url="http://localhost:8030", timeout=180) as client:
        if not args.resume_project:
            projects = call(client, "GET", "/api/v1/projects")["items"]
            if any(p["name"] == "04 · ОПиОП — калькуляция услуг и затрат" for p in projects):
                raise ValueError("OPIOP copy already exists; open it or explicitly resume its ID")
        project = (
            call(client, "GET", f"/api/v1/projects/{args.resume_project}")
            if args.resume_project
            else call(
                client,
                "POST",
                "/api/v1/projects",
                json={"name": "04 · ОПиОП — калькуляция услуг и затрат"},
            )
        )
        if project["name"] != "04 · ОПиОП — калькуляция услуг и затрат":
            raise ValueError("Refusing to resume an unrelated project")
        print(f"Created OPIOP copy: {project['id']}", flush=True)
        root = f"/api/v1/projects/{project['id']}"
        mapping[PROJECT] = project["id"]
        existing_sources = call(client, "GET", f"{root}/sources")["items"]
        existing_flows = call(client, "GET", f"{root}/workflows")["items"]
        existing_boards = call(client, "GET", f"{root}/dashboards")["items"]
        for source in sources:
            if source["type"] != "excel":
                raise ValueError("This transfer supports the original Excel project only")
            imported = next(
                (
                    s
                    for s in existing_sources
                    if s["original_filename"] == source["original_filename"]
                ),
                None,
            )
            if imported is None:
                imported = call(
                    client,
                    "POST",
                    f"{root}/sources/excel",
                    files={
                        "file": (source["original_filename"], source_bytes(source["storage_key"]))
                    },
                )
            mapping[source["id"]] = imported["id"]
        for flow in workflows:
            created = next((f for f in existing_flows if f["name"] == flow["name"]), None)
            if created is None:
                created = call(client, "POST", f"{root}/workflows", json={"name": flow["name"]})
            mapping[flow["id"]] = created["id"]
        for board in boards:
            created = next((b for b in existing_boards if b["name"] == board["name"]), None)
            if created is None:
                created = call(client, "POST", f"{root}/dashboards", json={"name": board["name"]})
            mapping[board["id"]] = created["id"]
        for flow in workflows:
            if any(f["id"] == mapping[flow["id"]] and f["revision"] > 1 for f in existing_flows):
                continue
            nodes = read("workflow_nodes", f"workflow_id='{flow['id']}'")
            edges = read("workflow_edges", f"workflow_id='{flow['id']}'")
            # Keep node/publication identities and derived field IDs in this separate database;
            # the source/workflow/dashboard identities are remapped. No textual formula rewriting.
            payload = {
                "name": flow["name"],
                "expected_revision": 1,
                "format_version": flow["version"],
                "parameters": flow["parameters"],
                "presentation": flow["presentation"],
                "result_catalog": flow["result_catalog"],
                "nodes": [
                    {
                        "id": n["id"],
                        "type": n["node_type"],
                        "version": n["node_version"],
                        "position": {"x": n["position_x"], "y": n["position_y"]},
                        "config": n["config"],
                        "ui": n["ui_state"],
                    }
                    for n in nodes
                ],
                "edges": [
                    {
                        key: edge[key]
                        for key in (
                            "id",
                            "source_node_id",
                            "source_port",
                            "source_column_id",
                            "target_node_id",
                            "target_port",
                        )
                    }
                    for edge in edges
                ],
            }
            call(client, "PUT", f"/api/v1/workflows/{mapping[flow['id']]}", json=remap(payload))
        existing_visuals = call(client, "GET", f"{root}/visualizations")["items"]
        for visual in visuals:
            existing = next(
                (
                    v
                    for v in existing_visuals
                    if v["name"] == visual["name"]
                    and v["publication_id"] == visual["publication_id"]
                    and v["type"] == visual["type"]
                ),
                None,
            )
            if existing:
                mapping[visual["id"]] = existing["id"]
                continue
            flow = call(client, "GET", f"/api/v1/workflows/{mapping[visual['workflow_id']]}")
            payload = {
                "request_id": str(uuid.uuid4()),
                "workflow_id": flow["id"],
                "expected_workflow_revision": flow["revision"],
                "publication_id": visual["publication_id"],
                "name": visual["name"],
                "type": visual["type"],
                "config": remap(visual["config"]),
            }
            response = client.post(f"{root}/visualizations", json=payload)
            if response.is_success:
                created = response.json()
            elif (
                response.status_code == 422
                and visual["type"] == "kpi"
                and "KPI requires exactly one row" in response.text
            ):
                # Archive restoration, not new authoring: a drill-through KPI can have zero
                # rows without its selected service. Retain its original calculation/config.
                # The application service validates bindings and revision; only the API's
                # context-free render callback is inapplicable to this existing document.
                code = """import sys,json,uuid
from app.infrastructure.database import SessionFactory
from app.schemas.dashboards import IndependentVisualizationSave
from app.services.independent_visualizations import IndependentVisualizationService
data=json.load(sys.stdin)
with SessionFactory() as session:
 result=IndependentVisualizationService(session).save(uuid.UUID(data['project']),IndependentVisualizationSave.model_validate(data['payload']))
 print(result.model_dump_json())
"""
                restored = subprocess.run(
                    ["docker", "exec", "-i", "nodebi-demo-backend-1", "python", "-c", code],
                    input=json.dumps({"project": project["id"], "payload": payload}),
                    capture_output=True,
                    check=True,
                    encoding="utf-8",
                )
                created = json.loads(restored.stdout)
            else:
                raise RuntimeError(
                    f"Unable to restore {visual['name']}: {response.status_code}: {response.text}"
                )
            mapping[visual["id"]] = created["id"]
        # Save destination role contracts before wiring cross-dashboard navigation.
        for board in boards:
            current = call(client, "GET", f"/api/v1/dashboards/{mapping[board['id']]}")
            call(
                client,
                "PUT",
                f"/api/v1/dashboards/{mapping[board['id']]}",
                json={
                    "name": board["name"],
                    "expected_revision": current["revision"],
                    "configuration": {**remap(board["configuration"]), "links": []},
                    "widgets": current["widgets"],
                },
            )
        for board in boards:
            widgets = read("dashboard_widgets", f"dashboard_id='{board['id']}'")
            current = call(client, "GET", f"/api/v1/dashboards/{mapping[board['id']]}")
            payload = {
                "name": board["name"],
                "expected_revision": current["revision"],
                "configuration": remap(board["configuration"]),
                "widgets": [
                    {
                        "id": str(uuid.uuid4()),
                        "visualization_id": mapping[w["visualization_id"]],
                        "title": w["title"],
                        "config": remap(w["config"]),
                        "x": w["position_x"],
                        "y": w["position_y"],
                        "width": w["width"],
                        "height": w["height"],
                    }
                    for w in widgets
                ],
            }
            call(client, "PUT", f"/api/v1/dashboards/{mapping[board['id']]}", json=payload)
            print(
                json.dumps(
                    {
                        "dashboard": board["name"],
                        "widgets": len(widgets),
                        "url": f"http://localhost:3030/projects/{project['id']}/dashboard?dashboard={mapping[board['id']]}&mode=view",
                    },
                    ensure_ascii=False,
                ),
                flush=True,
            )
        print(f"Copied {len(visuals)} visualizations. Original project unchanged.", flush=True)


if __name__ == "__main__":
    main()
