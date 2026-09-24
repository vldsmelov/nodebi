"""Generate public synthetic business books and an independent arithmetic oracle."""

import json
from pathlib import Path

from openpyxl import Workbook

ROOT = Path(__file__).parent / "excel"


def book(name, sheet, rows):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = sheet
    for row in rows:
        worksheet.append(row)
    worksheet.freeze_panes = "A2"
    worksheet.auto_filter.ref = worksheet.dimensions
    for column in worksheet.columns:
        worksheet.column_dimensions[column[0].column_letter].width = 26
    workbook.save(ROOT / f"business-{name}.xlsx")


sales = [["Месяц", "Регион", "Товар", "Количество", "Цена"]]
for month in range(1, 4):
    for region, factor in [("Казань", 1), ("Самара", 2)]:
        for product, quantity, price in [("А", 10, 100), ("Б", 5, 200)]:
            sales.append(
                [f"2026-{month:02}", region, product, quantity * month * factor, price]
            )
book("sales", "Продажи", sales)
book(
    "costs",
    "Себестоимость",
    [["Товар", "Себестоимость единицы"], ["А", 60], ["Б", 120]],
)
book(
    "plan",
    "План",
    [["Месяц", "План"], *[[f"2026-{m:02}", 6300 * m] for m in range(1, 4)]],
)

# Independently derived from the business specification, not Node BI executors.
expected = {
    "monthly": [
        {
            "Месяц": f"2026-{m:02}",
            "Выручка": 6000 * m,
            "Затраты": 3600 * m,
            "Валовая прибыль": 2400 * m,
            "План": 6300 * m,
            "Отклонение": -300 * m,
            "Выполнение плана": 20 / 21,
        }
        for m in range(1, 4)
    ],
    "total": {
        "Выручка": 36000,
        "Затраты": 21600,
        "Валовая прибыль": 14400,
        "План": 37800,
        "Выполнение плана": 20 / 21,
    },
    "regions": [
        {
            "Регион": name,
            "Выручка": 12000 * f,
            "Затраты": 7200 * f,
            "Валовая прибыль": 4800 * f,
        }
        for name, f in [("Казань", 1), ("Самара", 2)]
    ],
}
(ROOT / "business-expected.json").write_text(
    json.dumps(expected, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
