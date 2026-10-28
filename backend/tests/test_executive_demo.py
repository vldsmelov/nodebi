from decimal import Decimal
from pathlib import Path
from statistics import quantiles

from sqlalchemy.engine import Engine

from scripts.executive_demo import (
    FIXTURES,
    DemoProject,
    create_demo,
    financial_oracle,
    fixture_rows,
    verify_financials,
)
from tests.test_dataset_updates import check, stage_update
from tests.test_sources_api import make_client


def test_demo_fixtures_have_fixed_independent_financial_controls() -> None:
    assert len(fixture_rows()) == len(fixture_rows(True)) == 136
    assert fixture_rows()[0]["order_code"] == "000001"
    assert financial_oracle() == {
        "revenue": "1455960.32",
        "cost": "1018342.91",
        "plan": "1609160.00",
        "profit": "437617.41",
        "margin": "0.300570",
    }
    assert financial_oracle(True) == {
        "revenue": "1485960.32",
        "cost": "1029142.91",
        "plan": "1609160.00",
        "profit": "456817.41",
        "margin": "0.307422",
    }


def check_statistics(client, demo: DemoProject, updated: bool = False) -> None:
    observations = fixture_rows(updated)

    def result(key):
        response = client.post(f"/api/v1/visualizations/{demo.visualizations[key]}/result", json={})
        assert response.status_code == 200, response.text
        return response.json()

    def roles(dataset, bindings):
        names = {c["column_id"]: c["engine_name"] for c in dataset["columns"]}
        return [
            {key: row[names[identity]] for key, identity in bindings.items()}
            for row in dataset["rows"]
        ]

    trend = result("trend")
    assert trend["spec"]["secondary_axis"] is False
    assert len(trend["rows"]) == 6
    category = trend["category_field"]
    for row in trend["rows"]:
        month_rows = [r for r in observations if r["month"] == row[category]]
        assert Decimal(row["Выручка"]) == sum(Decimal(r["revenue"]) for r in month_rows)
        assert Decimal(row["План"]) == sum(Decimal(r["plan"]) for r in month_rows)

    heatmap = result("heatmap")
    cells = roles(heatmap["datasets"]["cells"], heatmap["spec"]["cells"])
    assert len(cells) == 18
    for cell in cells:
        matching = [r for r in observations if r["month"] == cell["x"] and r["region"] == cell["y"]]
        assert cell["row_count"] == len(matching)
        assert cell["present"] is bool(matching)
        assert (
            Decimal(cell["value"]) == sum(Decimal(r["revenue"]) for r in matching)
            if matching
            else cell["value"] is None
        )
    assert sum(c["value"] is None for c in cells) == 1
    assert sum(c["value"] is not None and Decimal(c["value"]) == 0 for c in cells) == 1

    box = result("boxplot")
    summaries = roles(box["datasets"]["summary"], box["spec"]["summary"])
    assert len(summaries) == 3
    for row in summaries:
        source = [r for r in observations if r["region"] == row["group"]]
        values = sorted(int(r["delivery_days"]) for r in source if r["delivery_days"])
        quartiles = quantiles(values, n=4, method="inclusive")
        assert row["count"] == len(values)
        assert row["missing_count"] == len(source) - len(values)
        assert [Decimal(row[key]) for key in ("q1", "median", "q3")] == [
            Decimal(str(v)) for v in quartiles
        ]
        iqr = quartiles[2] - quartiles[0]
        inside = [v for v in values if quartiles[0] - 1.5 * iqr <= v <= quartiles[2] + 1.5 * iqr]
        assert Decimal(row["lower_whisker"]) == min(inside)
        assert Decimal(row["upper_whisker"]) == max(inside)
        assert row["outlier_count"] == len(values) - len(inside)
    outliers = roles(box["datasets"]["outliers"], box["spec"]["outliers"])
    assert [Decimal(row["value"]) for row in outliers] == [Decimal(24)]

    histogram = result("histogram")
    bins = roles(histogram["datasets"]["bins"], histogram["spec"]["bins"])
    counts = [0] * 10
    for row in observations:
        if row["delivery_days"]:
            counts[min(int(row["delivery_days"]) // 3, 9)] += 1
    assert [row["count"] for row in bins] == counts
    summary = roles(histogram["datasets"]["summary"], histogram["spec"]["summary"])[0]
    assert (summary["input_count"], summary["valid_count"], summary["missing_count"]) == (
        136,
        135,
        1,
    )
    assert summary["above_count"] == summary["below_count"] == 0
    table = result("table")
    data = table["datasets"]["table"]
    names = {c["column_id"]: c["engine_name"] for c in data["columns"]}
    bindings = table["spec"]["rows"]
    assert len(data["rows"]) == 13  # 9 leaves, 3 regional totals, grand total
    for row in data["rows"]:
        depth = row[names[bindings["depth"]]]
        selected = observations
        for index, key in enumerate(("region", "product")):
            if index < depth:
                selected = [
                    r for r in selected if r[key] == row[names[table["spec"]["dimensions"][index]]]
                ]
        measures = table["spec"]["measures"]
        assert Decimal(row[names[measures[0]]]) == sum(Decimal(r["revenue"]) for r in selected)
        assert Decimal(row[names[measures[1]]]) == sum(Decimal(r["cost"]) for r in selected)
        assert int(row[names[measures[2]]]) == len(selected)


def test_demo_builds_eight_saved_widgets_through_public_apis(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = make_client(db_engine, tmp_path)
    unrelated = client.post("/api/v1/projects", json={"name": "Existing user project"}).json()
    demo = create_demo(client)
    verify_financials(client, demo)
    assert client.get(f"/api/v1/projects/{unrelated['id']}").status_code == 200
    dashboards = client.get(f"/api/v1/projects/{demo.project_id}/dashboards").json()["items"]
    assert len(dashboards) == 1
    assert len(dashboards[0]["widgets"]) == 8
    assert set(demo.visualizations) == {
        "revenue",
        "profit",
        "margin",
        "trend",
        "heatmap",
        "boxplot",
        "histogram",
        "table",
    }
    for identity in demo.visualizations.values():
        response = client.post(f"/api/v1/visualizations/{identity}/result", json={})
        assert response.status_code == 200, response.text
    snapshots = client.get(f"/api/v1/projects/{demo.project_id}/datasets").json()
    assert len(snapshots) == 1 and snapshots[0]["row_count"] == 136
    assert snapshots[0]["profile"]["key_fields"]
    check_statistics(client, demo)
    source = {"id": demo.source_id}
    update = stage_update(client, demo.project_id, source, (FIXTURES / "updated.csv").read_bytes())
    update = check(client, demo.project_id, update)
    assert not update["check"]["issues"], update
    verify_financials(client, demo)  # staging never changes active results
    applied = client.post(
        f"/api/v1/updates/{update['id']}/apply", json={"expected_revision": update["revision"]}
    )
    assert applied.status_code == 200, applied.text
    verify_financials(client, demo, updated=True)
    check_statistics(client, demo, updated=True)
    assert client.get(f"/api/v1/dashboards/{demo.dashboard_id}").json() == dashboards[0]
