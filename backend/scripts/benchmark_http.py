"""Disposable CSV -> Parquet -> report HTTP timings; no existing server/database touched."""

import argparse
import csv
import io
import json
import time
import uuid
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import httpx

from scripts.acceptance_process import process_client
from scripts.executive_demo import call


def fixture(rows: int, width: int, *, first_row_delta: int = 0) -> tuple[bytes, dict[str, Decimal]]:
    if not 1 <= rows <= 100000 or not 3 <= width <= 20:
        raise ValueError("Use 1..100000 rows and 3..20 columns (within import limits).")
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow(["code", "category", "amount", *[f"extra_{i}" for i in range(width - 3)]])
    totals: dict[str, Decimal] = {}
    for i in range(rows):
        category = f"Group {i % 10}"
        # Diverse exact cents, including negatives; oracle uses integer arithmetic.
        cents = (i * 37) % 200001 - 100000
        if i == 0:
            cents += first_row_delta
        amount = Decimal(cents).scaleb(-2)
        totals[category] = totals.get(category, Decimal(0)) + amount
        writer.writerow([f"{i:012d}", category, str(amount), *[str(amount)] * (width - 3)])
    return buffer.getvalue().encode(), totals


def check_update(client: httpx.Client, root: str, update: dict[str, Any]) -> dict[str, Any]:
    endpoint = f"/api/v1/updates/{update['id']}"
    job = call(client, "POST", endpoint + "/check", json={"expected_revision": update["revision"]})
    deadline = time.monotonic() + 180
    while True:
        response = client.get(root + "/report-jobs")
        response.raise_for_status()
        state = next(item for item in response.json() if item["id"] == job["id"])
        if state["status"] not in {"queued", "running"}:
            assert state["status"] == "succeeded", state
            break
        assert time.monotonic() < deadline, "Update check did not finish"
        time.sleep(0.05)
    response = client.get(root + "/updates")
    response.raise_for_status()
    checked: dict[str, Any] = next(item for item in response.json() if item["id"] == update["id"])
    assert not checked["check"]["issues"], checked
    return checked


def verify_cache_refresh(
    client: httpx.Client,
    root: str,
    source: dict[str, Any],
    report: dict[str, Any],
    category: str,
    rows: int,
    width: int,
    expected: dict[str, Decimal],
) -> dict[str, Any]:
    visual = call(client, "GET", f"/api/v1/visualizations/{report['visualization_id']}")
    endpoint = f"/api/v1/workflows/{report['workflow_id']}/nodes/{visual['node_id']}/preview"
    evidence: dict[str, Any] = {}

    def preview(stage: str, totals: dict[str, Decimal]) -> dict[str, Any]:
        result = call(client, "POST", endpoint, json={"limit": 20})
        assert {row[category]: Decimal(row["Revenue"]) for row in result["rows"]} == totals
        evidence[stage] = result["metadata"]
        if stage in {"updated", "rollback"}:
            rendered = call(
                client,
                "POST",
                f"/api/v1/visualizations/{report['visualization_id']}/result",
                json={},
            )
            assert {row[category]: Decimal(row["Revenue"]) for row in rendered["rows"]} == totals
        metadata: dict[str, Any] = result["metadata"]
        return metadata

    cold = preview("cold", expected)
    assert cold["cache_hits"] == 0 and cold["executed_nodes"] > 0
    warm = preview("warm", expected)
    assert warm["cache_hits"] == warm["executed_nodes"]
    content, changed = fixture(rows, width, first_row_delta=1)
    assert changed != expected
    version = call(
        client,
        "POST",
        f"/api/v1/sources/{source['id']}/versions",
        files={"file": ("updated.csv", content, "text/csv")},
    )
    update = call(client, "POST", root + "/updates")
    endpoint_update = f"/api/v1/updates/{update['id']}"
    update = call(
        client,
        "PUT",
        endpoint_update,
        json={
            "expected_revision": update["revision"],
            "items": [{"source_id": source["id"], "version_id": version["id"]}],
        },
    )
    checked = check_update(client, root, update)
    preview("staged_keeps_original", expected)
    applied = call(
        client, "POST", endpoint_update + "/apply", json={"expected_revision": checked["revision"]}
    )
    preview("updated", changed)
    refreshed = preview("updated_warm", changed)
    assert refreshed["cache_hits"] == refreshed["executed_nodes"]
    rollback = call(
        client,
        "POST",
        endpoint_update + "/rollback",
        json={"expected_revision": applied["revision"]},
    )
    rollback = check_update(client, root, rollback)
    call(
        client,
        "POST",
        f"/api/v1/updates/{rollback['id']}/apply",
        json={"expected_revision": rollback["revision"]},
    )
    preview("rollback", expected)
    return evidence


def run(rows: int, width: int) -> dict[str, Any]:
    content, expected = fixture(rows, width)
    timings: dict[str, float] = {}
    with TemporaryDirectory(prefix="nodebi-http-benchmark-") as directory:
        workspace = Path(directory)
        with process_client(workspace, timeout=180) as client:

            def timed(stage: str, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
                started = time.perf_counter()
                result = call(client, method, path, **kwargs)
                timings[stage] = round(time.perf_counter() - started, 4)
                return result

            project = call(client, "POST", "/api/v1/projects", json={"name": "HTTP benchmark"})
            root = f"/api/v1/projects/{project['id']}"
            source = timed(
                "upload",
                "POST",
                root + "/imports",
                data={"connector": "csv"},
                files={"file": ("benchmark.csv", content, "text/csv")},
            )
            endpoint = f"/api/v1/imports/{source['id']}"
            profile = timed(
                "inspect", "POST", endpoint + "/inspect", json={"resource_id": "table"}
            )["profile"]
            fields = {field["name"]: field["field_id"] for field in profile["fields"]}
            for field in profile["fields"]:
                if field["name"] not in {"code", "category"}:
                    field.update(logical_type="decimal", precision=38, scale=2)
                else:
                    field.update(logical_type="string")
            snapshot = timed(
                "normalize_parquet",
                "POST",
                endpoint + "/apply",
                json={
                    "profile": profile,
                    "expected_revision": source["revision"],
                    "request_id": str(uuid.uuid4()),
                },
            )
            assert snapshot["row_count"] == rows
            request = {
                "source_id": source["id"],
                "resource_id": "table",
                "expected_snapshot_id": snapshot["id"],
                "request_id": str(uuid.uuid4()),
                "name": "Exact grouped total",
                "dimensions": [fields["category"]],
                "presentation": "table",
                "measures": [
                    {"column_id": fields["amount"], "operation": "sum", "name": "Revenue"}
                ],
            }
            preview = timed(
                "report_preview", "POST", root + "/report-builder/preview", json=request
            )
            assert {
                row[fields["category"]]: Decimal(row["Revenue"]) for row in preview["rows"]
            } == expected
            report = timed("report_apply", "POST", root + "/report-builder/apply", json=request)
        # A new interpreter has no application execution cache from preview/apply.
        with process_client(workspace, timeout=180) as client:
            for stage in ("result_after_restart", "result_repeated"):
                started = time.perf_counter()
                result = call(
                    client,
                    "POST",
                    f"/api/v1/visualizations/{report['visualization_id']}/result",
                    json={},
                )
                timings[stage] = round(time.perf_counter() - started, 4)
                assert {
                    row[fields["category"]]: Decimal(row["Revenue"]) for row in result["rows"]
                } == expected
        storage_bytes = sum(
            path.stat().st_size for path in (workspace / "artifacts").rglob("*") if path.is_file()
        )
        # Separate fresh interpreter keeps cache evidence independent of result timing.
        with process_client(workspace, timeout=180) as client:
            cache_evidence = verify_cache_refresh(
                client, root, source, report, fields["category"], rows, width, expected
            )
    return {
        "rows": rows,
        "width": width,
        "csv_bytes": len(content),
        "storage_bytes": storage_bytes,
        "seconds": timings,
        "correctness": "passed",
        "cache_evidence": cache_evidence,
        "scope": (
            "real HTTP, private SQLite; restart clears application cache, not OS cache; "
            "cache counters verified separately through graph preview; "
            "storage measured before refresh"
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=100000)
    parser.add_argument("--widths", type=int, nargs="+", choices=[3, 20], default=[3, 20])
    args = parser.parse_args()
    for width in args.widths:
        print(json.dumps(run(args.rows, width)), flush=True)


if __name__ == "__main__":
    main()
