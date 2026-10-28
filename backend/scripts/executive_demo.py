"""Create an isolated synthetic showcase using only the public Node BI API.

Run from backend/: python -m scripts.executive_demo --api-url http://localhost:8000
Every run creates a NEW project. Existing projects are never reused or removed.
"""

import argparse
import csv
import json
import sys
import uuid
from dataclasses import asdict, dataclass
from decimal import ROUND_HALF_EVEN, Decimal
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "executive"
NAMES = {
    "order_code": "Код заказа",
    "month": "Месяц",
    "region": "Регион",
    "product": "Направление",
    "revenue": "Выручка",
    "cost": "Затраты",
    "plan": "План",
    "delivery_days": "Срок доставки, дней",
}


@dataclass
class DemoProject:
    project_id: str
    source_id: str
    dashboard_id: str
    visualizations: dict[str, str]


def call(client: httpx.Client, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
    response = client.request(method, path, **kwargs)
    if not response.is_success:
        raise RuntimeError(f"{method} {path}: {response.status_code}: {response.text}")
    payload: object = response.json() if response.content else {}
    if not isinstance(payload, dict):
        raise RuntimeError(f"{method} {path}: expected an API object")
    return payload


def fixture_rows(updated: bool = False) -> list[dict[str, str]]:
    with (FIXTURES / ("updated.csv" if updated else "initial.csv")).open(encoding="utf-8") as file:
        return list(csv.DictReader(file))


def financial_oracle(updated: bool = False) -> dict[str, str]:
    """Independent Decimal oracle, not a call into the dataframe/formula engine."""
    rows = fixture_rows(updated)
    totals = {
        name: sum((Decimal(r[name]) for r in rows), Decimal(0))
        for name in ("revenue", "cost", "plan")
    }
    profit = totals["revenue"] - totals["cost"]
    return {
        **{key: str(value.quantize(Decimal("0.01"))) for key, value in totals.items()},
        "profit": str(profit.quantize(Decimal("0.01"))),
        "margin": str(
            (profit / totals["revenue"]).quantize(Decimal("0.000001"), rounding=ROUND_HALF_EVEN)
        ),
    }


def create_demo(client: httpx.Client, name: str = "Демо · Финансы и операции") -> DemoProject:
    project = call(client, "POST", "/api/v1/projects", json={"name": name})
    root = f"/api/v1/projects/{project['id']}"
    # Emit the recovery target even if a subsequent API call fails. Never hide partial state.
    print(f"Created synthetic demo project: {project['id']}", file=sys.stderr)
    source = call(
        client,
        "POST",
        f"{root}/imports",
        data={"connector": "csv"},
        files={
            "file": ("executive-orders.csv", (FIXTURES / "initial.csv").read_bytes(), "text/csv"),
        },
    )
    profile = call(
        client, "POST", f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    )["profile"]
    fields = {field["name"]: field["field_id"] for field in profile["fields"]}
    for field in profile["fields"]:
        key = field["name"]
        field["name"] = NAMES[key]
        if key in {"revenue", "cost", "plan"}:
            field.update(
                logical_type="decimal", precision=38, scale=2, currency="RUB", nullable=False
            )
        elif key == "order_code":
            field.update(logical_type="string", nullable=False)
        elif key == "month":
            field.update(logical_type="date", nullable=False)
        elif key == "delivery_days":
            field.update(logical_type="integer", unit="day")
    profile.update(
        name="Демо · Заказы за январь–июнь 2026",
        grain="Одна строка — синтетический заказ; план — ожидаемая выручка этого заказа.",
        key_fields=[fields["order_code"]],
    )
    snapshot = call(
        client,
        "POST",
        f"/api/v1/imports/{source['id']}/apply",
        json={
            "profile": profile,
            "expected_revision": source["revision"],
            "request_id": str(uuid.uuid4()),
        },
    )
    input_settings = {
        "source_id": source["id"],
        "resource_id": "table",
        "expected_snapshot_id": snapshot["id"],
    }
    dashboards: list[str] = []

    def report(
        title: str,
        dimensions: list[str],
        measures: list[dict[str, Any]],
        formulas: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        result = call(
            client,
            "POST",
            f"{root}/report-builder/apply",
            json={
                **input_settings,
                "request_id": str(uuid.uuid4()),
                "name": title,
                "dimensions": dimensions,
                "measures": measures,
                "summary_formulas": formulas or [],
            },
        )
        dashboards.append(result["dashboard_id"])
        return result

    def measure(key: str) -> dict[str, Any]:
        return {
            "output_id": str(uuid.uuid4()),
            "name": NAMES[key],
            "operation": "sum",
            "column_id": fields[key],
        }

    def output_id(item: dict[str, Any]) -> str:
        return "measure_" + str(item["output_id"]).replace("-", "")

    measures = [measure(key) for key in ("revenue", "cost", "plan")]
    profit_id, margin_id = str(uuid.uuid4()), str(uuid.uuid4())
    profit_field = "calc_" + profit_id.replace("-", "")
    totals = report(
        "Финансовые итоги · контроль расчёта",
        [],
        measures,
        [
            {
                "node_id": profit_id,
                "name": "Прибыль",
                "expression": f"[{output_id(measures[0])}] - [{output_id(measures[1])}]",
                "scale": 2,
            },
            {
                "node_id": margin_id,
                "name": "Рентабельность",
                "expression": f"[{profit_field}] / nullif([{output_id(measures[0])}], 0)",
                "scale": 6,
            },
        ],
    )

    def visualization(
        base: dict[str, Any], title: str, kind: str, config: dict[str, Any], replace: bool = False
    ) -> str:
        graph = call(client, "GET", f"/api/v1/workflows/{base['workflow_id']}")
        body = {
            "request_id": str(uuid.uuid4()),
            "workflow_id": base["workflow_id"],
            "publication_id": base["publication_id"],
            "expected_workflow_revision": graph["revision"],
            "name": title,
            "type": kind,
            "config": {"title": title, **config},
        }
        path = f"{root}/visualizations"
        if replace:
            path = f"/api/v1/visualizations/{base['visualization_id']}"
            body["expected_revision"] = call(client, "GET", path)["revision"]
        return str(call(client, "PUT" if replace else "POST", path, json=body)["id"])

    visuals = {
        "revenue": visualization(
            totals,
            "Выручка · ₽",
            "kpi",
            {
                "value_column_id": output_id(measures[0]),
                "number_format": "currency",
                "currency": "RUB",
            },
        ),
        "profit": visualization(
            totals,
            "Прибыль · ₽",
            "kpi",
            {"value_column_id": profit_field, "number_format": "currency", "currency": "RUB"},
        ),
        "margin": visualization(
            totals,
            "Рентабельность · отношение итогов",
            "kpi",
            {
                "value_column_id": "calc_" + margin_id.replace("-", ""),
                "number_format": "percent",
                "decimals": 2,
            },
        ),
    }
    monthly_measures = [measure(key) for key in ("revenue", "plan")]
    monthly = report("Выручка и план по месяцам", [fields["month"]], monthly_measures)
    visuals["trend"] = visualization(
        monthly,
        "Выручка и план · ₽, одна шкала",
        "combo_chart",
        {
            "number_format": "currency",
            "currency": "RUB",
            "spec": {
                "version": 1,
                "type": "combo_chart",
                "category_column_id": fields["month"],
                "secondary_axis": False,
                "series": [
                    {"column_id": output_id(monthly_measures[0]), "kind": "bar", "name": "Выручка"},
                    {"column_id": output_id(monthly_measures[1]), "kind": "line", "name": "План"},
                ],
            },
        },
        replace=True,
    )

    def statistical(key: str, title: str, analysis: dict[str, Any]) -> None:
        result = call(
            client,
            "POST",
            f"{root}/statistical-reports/apply",
            json={
                **input_settings,
                "request_id": str(uuid.uuid4()),
                "name": title,
                "analysis": analysis,
            },
        )
        dashboards.append(result["dashboard_id"])
        visuals[key] = result["visualization_id"]

    statistical(
        "heatmap",
        "Выручка по регионам и месяцам · ₽",
        {
            "type": "heatmap_stats",
            "x_column_id": fields["month"],
            "y_column_id": fields["region"],
            "value_column_id": fields["revenue"],
            "aggregation": "sum",
        },
    )
    statistical(
        "boxplot",
        "Срок доставки по регионам · дни",
        {
            "type": "boxplot_stats",
            "value_column_id": fields["delivery_days"],
            "group_column_id": fields["region"],
        },
    )
    statistical(
        "histogram",
        "Распределение сроков доставки · дни",
        {
            "type": "histogram",
            "value_column_id": fields["delivery_days"],
            "bin_count": 10,
            "range_min": "0",
            "range_max": "30",
        },
    )
    statistical(
        "table",
        "Регионы и направления · итоги заказов",
        {
            "type": "table_rollup",
            "dimensions": [fields["region"], fields["product"]],
            "subtotals": True,
            "grand_total": True,
            "measures": [
                {**measure("revenue"), "scale": 2},
                {**measure("cost"), "scale": 2},
                {"output_id": str(uuid.uuid4()), "name": "Заказы", "operation": "count_rows"},
            ],
        },
    )
    layout = [
        ("revenue", 0, 0, 4, 5),
        ("profit", 4, 0, 4, 5),
        ("margin", 8, 0, 4, 5),
        ("trend", 0, 5, 7, 11),
        ("heatmap", 7, 5, 5, 11),
        ("boxplot", 0, 16, 6, 12),
        ("histogram", 6, 16, 6, 12),
        ("table", 0, 28, 12, 14),
    ]
    dashboard = call(client, "GET", f"/api/v1/dashboards/{dashboards[0]}")
    call(
        client,
        "PUT",
        f"/api/v1/dashboards/{dashboard['id']}",
        json={
            "name": "Демо · Финансы и операции · I полугодие 2026",
            "expected_revision": dashboard["revision"],
            "widgets": [
                {
                    "id": str(uuid.uuid4()),
                    "visualization_id": visuals[key],
                    "x": x,
                    "y": y,
                    "width": width,
                    "height": height,
                }
                for key, x, y, width, height in layout
            ],
        },
    )
    # Only remove redundant dashboards just created by this function, never user dashboards.
    for identity in dashboards[1:]:
        call(client, "DELETE", f"/api/v1/dashboards/{identity}")
    demo = DemoProject(project["id"], source["id"], dashboard["id"], visuals)
    verify_financials(client, demo)
    return demo


def verify_financials(client: httpx.Client, demo: DemoProject, updated: bool = False) -> None:
    expected = financial_oracle(updated)
    for key in ("revenue", "profit", "margin"):
        result = call(
            client, "POST", f"/api/v1/visualizations/{demo.visualizations[key]}/result", json={}
        )
        actual = result["rows"][0][result["value_field"]]
        if actual != expected[key]:
            raise RuntimeError(f"Demo {key}: expected {expected[key]}, received {actual}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--name", default="Демо · Финансы и операции")
    args = parser.parse_args()
    address = urlparse(args.api_url)
    if (
        address.scheme not in {"http", "https"}
        or address.hostname not in {"localhost", "127.0.0.1", "::1"}
        or address.username
        or address.password
    ):
        parser.error("Use a local Node BI API without URL credentials.")
    with httpx.Client(base_url=args.api_url.rstrip("/"), timeout=120) as client:
        demo = create_demo(client, args.name)
    print(
        json.dumps(
            {
                **asdict(demo),
                "dashboard_path": (
                    f"/projects/{demo.project_id}/dashboard?dashboard={demo.dashboard_id}&mode=view"
                ),
                "expected": financial_oracle(),
                "updated_expected": financial_oracle(True),
                "update_file": str(FIXTURES / "updated.csv"),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
