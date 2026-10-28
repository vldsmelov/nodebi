"""Populate the persistent local demo through public APIs. No test runner or database writes.

Every selected scenario creates a NEW project. IDs are printed immediately for recovery.
Run: python -m scripts.showcase --scenario all
"""

import argparse
import csv
import io
import json
import uuid
from typing import Any
from urllib.parse import urlparse

import httpx
from openpyxl import Workbook

from scripts.executive_demo import call, create_demo


def identity() -> str:
    return str(uuid.uuid4())


class Showcase:
    def __init__(self, client: httpx.Client, name: str, project_id: str | None = None):
        self.client = client
        self.project_id = (
            project_id or call(client, "POST", "/api/v1/projects", json={"name": name})["id"]
        )
        self.root = f"/api/v1/projects/{self.project_id}"
        self.name = name
        self.boards: list[str] = []
        self.visuals: list[str] = []
        print(f"{name}: {self.project_id}", flush=True)

    def request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        return call(self.client, method, path, **kwargs)

    def source(
        self,
        name: str,
        rows: list[dict[str, Any]],
        money: tuple[str, ...] = (),
        excel: bool = False,
    ) -> tuple[dict[str, Any], dict[str, str]]:
        if excel:
            book = Workbook()
            sheet = book.active
            sheet.title = "Данные"
            sheet.append(list(rows[0]))
            for row in rows:
                sheet.append(list(row.values()))
            stream = io.BytesIO()
            book.save(stream)
            content = stream.getvalue()
        else:
            stream_text = io.StringIO()
            writer = csv.DictWriter(stream_text, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
            content = stream_text.getvalue().encode("utf-8-sig")
        source = self.request(
            "POST",
            f"{self.root}/imports",
            data={"connector": "excel" if excel else "csv"},
            files={"file": (name + (".xlsx" if excel else ".csv"), content)},
        )
        resource = source["resources"][0]["id"]
        profile = self.request(
            "POST", f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": resource}
        )["profile"]
        fields = {field["name"]: field["field_id"] for field in profile["fields"]}
        for field in profile["fields"]:
            if field["name"] in money:
                field.update(logical_type="decimal", precision=38, scale=2, currency="RUB")
        profile.update(name=name, grain="Синтетические демонстрационные данные. " + name)
        snapshot = self.request(
            "POST",
            f"/api/v1/imports/{source['id']}/apply",
            json={
                "profile": profile,
                "expected_revision": source["revision"],
                "request_id": identity(),
            },
        )
        return {
            "source_id": source["id"],
            "resource_id": resource,
            "expected_snapshot_id": snapshot["id"],
        }, fields

    def report(
        self,
        source: dict[str, Any],
        name: str,
        dimensions: list[str],
        metrics: list[tuple[str, str, str]],
    ) -> tuple[dict[str, Any], dict[str, str]]:
        measures = [
            {"output_id": identity(), "column_id": field, "name": label, "operation": op}
            for field, label, op in metrics
        ]
        result = self.request(
            "POST",
            f"{self.root}/report-builder/apply",
            json={
                **source,
                "request_id": identity(),
                "name": name,
                "dimensions": dimensions,
                "measures": measures,
            },
        )
        self.boards.append(result["dashboard_id"])
        return result, {m["name"]: "measure_" + m["output_id"].replace("-", "") for m in measures}

    def chart(self, base: dict[str, Any], name: str, kind: str, config: dict[str, Any]) -> str:
        graph = self.request("GET", f"/api/v1/workflows/{base['workflow_id']}")
        result = self.request(
            "POST",
            f"{self.root}/visualizations",
            json={
                "request_id": identity(),
                "workflow_id": base["workflow_id"],
                "publication_id": base["publication_id"],
                "expected_workflow_revision": graph["revision"],
                "name": name,
                "type": kind,
                "config": {"title": name, **config},
            },
        )
        self.visuals.append(result["id"])
        return result["id"]

    def analysis(self, source: dict[str, Any], name: str, settings: dict[str, Any]) -> str:
        result = self.request(
            "POST",
            f"{self.root}/statistical-reports/apply",
            json={**source, "request_id": identity(), "name": name, "analysis": settings},
        )
        self.boards.append(result["dashboard_id"])
        self.visuals.append(result["visualization_id"])
        if settings["type"] in {"treemap_chart", "sunburst_chart"}:
            visual = self.request("GET", f"/api/v1/visualizations/{result['visualization_id']}")
            graph = self.request("GET", f"/api/v1/workflows/{result['workflow_id']}")
            self.request(
                "PUT",
                f"/api/v1/visualizations/{visual['id']}",
                json={
                    "request_id": identity(),
                    "expected_revision": visual["revision"],
                    "expected_workflow_revision": graph["revision"],
                    "workflow_id": visual["workflow_id"],
                    "publication_id": visual["publication_id"],
                    "name": visual["name"],
                    "type": visual["type"],
                    "config": {**visual["config"], "show_labels": True},
                },
            )
        return result["visualization_id"]

    def finish(self, name: str, layout: list[tuple[str, int, int, int, int]] | None = None) -> None:
        if layout is None:
            layout = [
                (vid, (i % 2) * 6, (i // 2) * 15, 6, 15) for i, vid in enumerate(self.visuals)
            ]
            if len(layout) % 2:
                vid, x, y, _, height = layout[-1]
                layout[-1] = (vid, x, y, 12, height)
        board = self.request("GET", f"/api/v1/dashboards/{self.boards[0]}")
        self.request(
            "PUT",
            f"/api/v1/dashboards/{board['id']}",
            json={
                "name": name,
                "expected_revision": board["revision"],
                "widgets": [
                    {
                        "id": identity(),
                        "visualization_id": vid,
                        "x": x,
                        "y": y,
                        "width": w,
                        "height": h,
                    }
                    for vid, x, y, w, h in layout
                ],
            },
        )
        # Only redundant boards created during this scenario; never existing user objects.
        for board_id in self.boards[1:]:
            self.request("DELETE", f"/api/v1/dashboards/{board_id}")
        # Materialize saved reports for the presentation, without running a test suite.
        for vid in self.visuals:
            self.request("POST", f"/api/v1/visualizations/{vid}/result", json={})
        print(
            json.dumps(
                {
                    "project": self.name,
                    "widgets": len(layout),
                    "url": f"http://localhost:3030/projects/{self.project_id}/dashboard?dashboard={board['id']}&mode=view",
                },
                ensure_ascii=False,
            ),
            flush=True,
        )


def finance(client: httpx.Client) -> None:
    demo = create_demo(client, "01 · Совет директоров — финансы и план-факт")
    show = Showcase(client, "01 · Совет директоров — финансы и план-факт", demo.project_id)
    # A separate, explicitly named budget bridge: not presented as the orders' profit.
    source, f = show.source(
        "Сценарий бюджета следующего полугодия · рубли",
        [
            {"Фактор": label, "Сумма": value, "Тип": kind, "Порядок": i}
            for i, (label, value, kind) in enumerate(
                [
                    ("Базовая прибыль", "440000.00", "initial"),
                    ("Рост продаж", "180000.00", "change"),
                    ("Скидки", "-45000.00", "change"),
                    ("Закупочные цены", "-85000.00", "change"),
                    ("Экономия логистики", "35000.00", "change"),
                    ("Маркетинг", "-25000.00", "change"),
                ],
                1,
            )
        ],
        ("Сумма",),
        excel=True,
    )
    show.analysis(
        source,
        "Бюджетный сценарий · от 440 до 500 тыс. ₽",
        {
            "type": "waterfall_steps",
            "category_column_id": f["Фактор"],
            "value_column_id": f["Сумма"],
            "kind_column_id": f["Тип"],
            "order_column_id": f["Порядок"],
            "append_total": True,
            "total_label": "Прогноз прибыли",
        },
    )
    board = show.request("GET", f"/api/v1/dashboards/{demo.dashboard_id}")
    widgets = [
        {k: item[k] for k in ("id", "visualization_id", "x", "y", "width", "height")}
        for item in board["widgets"]
    ]
    widgets.append(
        {
            "id": identity(),
            "visualization_id": show.visuals[0],
            "x": 0,
            "y": 42,
            "width": 12,
            "height": 15,
        }
    )
    show.request(
        "PUT",
        f"/api/v1/dashboards/{demo.dashboard_id}",
        json={
            "name": "Финансы · результаты полугодия и бюджетный сценарий",
            "expected_revision": board["revision"],
            "widgets": widgets,
        },
    )
    for board_id in show.boards:
        show.request("DELETE", f"/api/v1/dashboards/{board_id}")
    for vid in [*demo.visualizations.values(), *show.visuals]:
        show.request("POST", f"/api/v1/visualizations/{vid}/result", json={})
    print(
        f"http://localhost:3030/projects/{demo.project_id}/dashboard?dashboard={demo.dashboard_id}&mode=view",
        flush=True,
    )


def sales(client: httpx.Client) -> None:
    show = Showcase(client, "02 · Коммерческий директор — ассортимент и воронка")
    products = [
        "Ноутбуки",
        "Мониторы",
        "Серверы",
        "Сети",
        "Принтеры",
        "Периферия",
        "Сервис",
        "Обучение",
    ]
    rows = [
        {
            "Регион": region,
            "Направление": "Оборудование" if p < 6 else "Услуги",
            "Продукт": product,
            "Выручка": str((9 - p) ** 2 * (r + 2) * 1250),
            "Прибыль": str((9 - p) ** 2 * (r + 2) * (240 + p * 25)),
            "Сделки": (9 - p) * (r + 2) * 3,
        }
        for r, region in enumerate(["Центр", "Поволжье", "Северо-Запад"])
        for p, product in enumerate(products)
    ]
    source, f = show.source(
        "Продажи · регион и продукт за полугодие", rows, ("Выручка", "Прибыль"), excel=True
    )
    base, m = show.report(
        source,
        "Экономика продуктовых направлений",
        [f["Продукт"]],
        [(f[key], key, "sum") for key in ("Выручка", "Прибыль", "Сделки")],
    )
    show.chart(
        base,
        "Какие продукты дают выручку? · ₽",
        "bar_chart",
        {
            "category_column_id": f["Продукт"],
            "value_column_id": m["Выручка"],
            "orientation": "horizontal",
            "number_format": "currency",
            "currency": "RUB",
            "show_legend": False,
        },
    )
    show.chart(
        base,
        "Структура выручки · доли продуктов",
        "donut_chart",
        {"category_column_id": f["Продукт"], "value_column_id": m["Выручка"], "show_labels": True},
    )
    show.chart(
        base,
        "Портфель · X: выручка, Y: прибыль, площадь: сделки",
        "bubble_chart",
        {
            "spec": {
                "version": 1,
                "type": "bubble_chart",
                "key_column_id": f["Продукт"],
                "label_column_id": f["Продукт"],
                "x_column_id": m["Выручка"],
                "y_column_id": m["Прибыль"],
                "size_column_id": m["Сделки"],
            },
            "show_labels": True,
        },
    )
    # Reuse the actual aggregation graph so browser edits update every sales view together.
    prepared = show.request(
        "GET",
        f"{show.root}/report-builder/inputs/{base['workflow_id']}/{base['publication_id']}",
    )
    show.analysis(
        {
            "published_input": {
                "workflow_id": base["workflow_id"],
                "publication_id": base["publication_id"],
                "expected_token": prepared["expected_token"],
            }
        },
        "Парето · где сосредоточена выручка?",
        {"type": "pareto", "category_column_id": f["Продукт"], "value_column_id": m["Выручка"]},
    )
    for kind, title in [
        ("treemap_chart", "Структура бизнеса · регион → направление → продукт"),
        ("sunburst_chart", "Вклад регионов и направлений · иерархия выручки"),
    ]:
        show.analysis(
            source,
            title,
            {
                "type": kind,
                "dimensions": [f["Регион"], f["Направление"], f["Продукт"]],
                "subtotals": True,
                "grand_total": True,
                "measures": [
                    {
                        "output_id": identity(),
                        "column_id": f["Выручка"],
                        "name": "Выручка",
                        "operation": "sum",
                        "scale": 2,
                    }
                ],
            },
        )
    pipeline, ff = show.source(
        "Воронка одной когорты · лиды января 2026",
        [
            {"Этап": stage, "Порядок": i, "Клиенты": count}
            for i, (stage, count) in enumerate(
                [
                    ("Лиды", 1200),
                    ("Квалификация", 780),
                    ("Встречи", 480),
                    ("Предложения", 300),
                    ("Договоры", 180),
                    ("Оплаты", 144),
                ],
                1,
            )
        ],
    )
    show.analysis(
        pipeline,
        "Конверсия когорты · от 1200 лидов к 144 оплатам",
        {
            "type": "funnel_steps",
            "stage_column_id": ff["Этап"],
            "order_column_id": ff["Порядок"],
            "value_column_id": ff["Клиенты"],
        },
    )
    show.finish("Продажи · концентрация выручки, продуктовый портфель и конверсия")


def logistics(client: httpx.Client) -> None:
    show = Showcase(client, "03 · Операционный директор — качество доставки")
    carriers = ["Экспресс", "Регион", "Магистраль", "Партнёр"]
    rows = [
        {
            "Заказ": f"L{c + 1}{i:04d}",
            "Перевозчик": carrier,
            "Дней": 19 if c == 2 and i == 39 else 2 + c + (i * 7 % (3 + c)),
            "Месяц": f"2026-{1 + i % 6:02d}",
            "Стоимость": str(320 + c * 65 + (i % 8) * 20),
        }
        for c, carrier in enumerate(carriers)
        for i in range(40)
    ]
    source, f = show.source("Доставки · 160 синтетических заказов", rows, ("Стоимость",))
    show.analysis(
        source,
        "Надёжность доставки · медиана, разброс и выбросы",
        {"type": "boxplot_stats", "value_column_id": f["Дней"], "group_column_id": f["Перевозчик"]},
    )
    show.analysis(
        source,
        "Сколько заказов доставляется за каждый срок?",
        {
            "type": "histogram",
            "value_column_id": f["Дней"],
            "bin_count": 10,
            "range_min": "0",
            "range_max": "20",
        },
    )
    show.analysis(
        source,
        "Средний срок · перевозчик × месяц, дни",
        {
            "type": "heatmap_stats",
            "x_column_id": f["Месяц"],
            "y_column_id": f["Перевозчик"],
            "value_column_id": f["Дней"],
            "aggregation": "average",
        },
    )
    ratings, rf = show.source(
        "Экспертная оценка SLA · баллы 0–100, выше лучше",
        [
            {
                "Перевозчик": carrier,
                "Скорость": speed,
                "Сохранность": quality,
                "Сервис": service,
                "Своевременно": actual,
                "Цель": 95,
            }
            for carrier, speed, quality, service, actual in zip(
                carriers,
                [96, 80, 62, 75],
                [88, 97, 90, 82],
                [92, 78, 72, 96],
                [97, 93, 84, 90],
                strict=True,
            )
        ],
        excel=True,
    )
    base, m = show.report(
        ratings,
        "Карточка перевозчика · экспертная оценка и SLA",
        [rf["Перевозчик"]],
        [
            (rf[key], key, "average")
            for key in ("Скорость", "Сохранность", "Сервис", "Своевременно", "Цель")
        ],
    )
    show.chart(
        base,
        "Профили перевозчиков · экспертные баллы, 0–100",
        "radar_chart",
        {
            "spec": {
                "version": 1,
                "type": "radar_chart",
                "profile_column_id": rf["Перевозчик"],
                "normalization": "shared",
                "axes": [
                    {"column_id": m[key], "minimum": "0", "maximum": "100"}
                    for key in ("Скорость", "Сохранность", "Сервис")
                ],
            }
        },
    )
    show.chart(
        base,
        "SLA · своевременные доставки, %, цель 95",
        "bullet_chart",
        {
            "decimals": 0,
            "show_labels": True,
            "spec": {
                "version": 1,
                "type": "bullet_chart",
                "category_column_id": rf["Перевозчик"],
                "actual_column_id": m["Своевременно"],
                "target_column_id": m["Цель"],
                "minimum": "0",
                "maximum": "100",
                "bands": [
                    {"label": "Критично", "upper": "85", "tone": "negative"},
                    {"label": "Зона внимания", "upper": "95", "tone": "warning"},
                    {"label": "Цель достигнута", "upper": "100", "tone": "positive"},
                ],
            },
        },
    )
    monthly, mm = show.report(
        source,
        "Динамика среднего срока доставки",
        [f["Месяц"]],
        [(f["Дней"], "Средний срок", "average")],
    )
    show.chart(
        monthly,
        "Динамика среднего срока · дни",
        "line_chart",
        {
            "category_column_id": f["Месяц"],
            "value_column_id": mm["Средний срок"],
            "show_labels": True,
        },
    )
    show.finish("Логистика · стабильность сроков, проблемные перевозчики и SLA")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", default="http://localhost:8030")
    parser.add_argument(
        "--scenario", choices=["all", "finance", "sales", "logistics"], default="all"
    )
    args = parser.parse_args()
    address = urlparse(args.api_url)
    if (
        address.scheme not in {"http", "https"}
        or address.hostname not in {"localhost", "127.0.0.1"}
        or address.username
        or address.password
    ):
        parser.error("Only a local API without URL credentials is allowed.")
    with httpx.Client(base_url=args.api_url.rstrip("/"), timeout=180) as client:
        for name, populate in [("finance", finance), ("sales", sales), ("logistics", logistics)]:
            if args.scenario in {"all", name}:
                populate(client)


if __name__ == "__main__":
    main()
