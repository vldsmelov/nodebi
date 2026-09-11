"""Repeatable local API smoke benchmark; removes only its newly created project."""

import json
from io import BytesIO
from time import perf_counter
from uuid import uuid4

import httpx
from openpyxl import Workbook


def main() -> None:
    measurements: dict[str, float] = {}
    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet("Sales")
    sheet.append(["category", "quantity", "price"])
    for index in range(50_000):
        sheet.append([f"Category {index % 20}", index % 10 + 1, 12.5])
    stream = BytesIO()
    workbook.save(stream)
    with httpx.Client(
        base_url="http://127.0.0.1:8000/api/v1", timeout=120, trust_env=False
    ) as client:

        def request(method: str, path: str, **kwargs):
            response = client.request(method, path, **kwargs)
            response.raise_for_status()
            return response.json()

        project = request("POST", "/projects", json={"name": "QA benchmark (temporary)"})
        try:
            start = perf_counter()
            source = request(
                "POST",
                f"/projects/{project['id']}/sources/excel",
                files={"file": ("benchmark.xlsx", stream.getvalue())},
            )
            measurements["upload_inspect_ms"] = (perf_counter() - start) * 1000
            workflow = request(
                "POST", f"/projects/{project['id']}/workflows", json={"name": "Bench"}
            )
            ids = [uuid4() for _ in range(5)]
            definitions = [
                ("excel_source", {"source_id": source["id"], "sheet_name": "Sales"}),
                (
                    "filter",
                    {
                        "conditions": [
                            {"column_id": "col_2", "operator": "greater_than", "value": 5}
                        ]
                    },
                ),
                ("calculated_column", {"name": "revenue", "expression": "quantity * price"}),
                (
                    "group_by",
                    {
                        "dimensions": ["col_1"],
                        "aggregations": [
                            {"column_id": f"calc_{ids[2].hex}", "operation": "sum", "name": "total"}
                        ],
                    },
                ),
                (
                    "bar_chart",
                    {"category_column_id": "col_1", "value_column_id": f"agg_{ids[3].hex}_0"},
                ),
            ]
            request(
                "PUT",
                f"/workflows/{workflow['id']}",
                json={
                    "name": "Bench",
                    "expected_revision": 1,
                    "nodes": [
                        {
                            "id": str(ids[i]),
                            "type": kind,
                            "version": 1,
                            "position": {"x": i * 200, "y": 0},
                            "config": config,
                        }
                        for i, (kind, config) in enumerate(definitions)
                    ],
                    "edges": [
                        {
                            "id": str(uuid4()),
                            "source_node_id": str(ids[i]),
                            "source_port": "dataset",
                            "target_node_id": str(ids[i + 1]),
                            "target_port": "input",
                        }
                        for i in range(4)
                    ],
                },
            )
            for label, index in [
                ("source_cold", 0),
                ("source_warm", 0),
                ("filter", 1),
                ("group", 3),
            ]:
                start = perf_counter()
                result = request(
                    "POST",
                    f"/workflows/{workflow['id']}/nodes/{ids[index]}/preview",
                    json={"limit": 20},
                )
                measurements[f"{label}_ms"] = (perf_counter() - start) * 1000
                assert result["total_rows"] == {0: 50000, 1: 25000, 3: 10}[index]
            start = perf_counter()
            result = request("GET", f"/visualizations/{ids[4]}/result")
            measurements["chart_warm_ms"] = (perf_counter() - start) * 1000
            assert sum(row["total"] for row in result["rows"]) == 2_500_000
            print(
                json.dumps(
                    {
                        "rows": 50000,
                        "bytes": len(stream.getvalue()),
                        "measurements": {
                            key: round(value, 1) for key, value in measurements.items()
                        },
                    },
                    indent=2,
                )
            )
        finally:
            response = client.delete(f"/projects/{project['id']}?confirm=true")
            response.raise_for_status()


if __name__ == "__main__":
    main()
