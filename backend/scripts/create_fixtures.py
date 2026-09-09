from datetime import date
from pathlib import Path

from openpyxl import Workbook


def create_sales_fixture(destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Sales"
    sheet.append(["order_id", "order_date", "country", "category", "product", "quantity", "price"])
    rows = [
        (1, date(2026, 1, 3), "Korea", "Hardware", "Keyboard", 2, 80.0),
        (2, date(2026, 1, 4), "Korea", "Software", "Analytics", 1, 240.0),
        (3, date(2026, 1, 5), "Japan", "Hardware", "Monitor", 2, 310.5),
        (4, date(2026, 1, 6), "Korea", "Hardware", "Mouse", 4, 25.0),
        (5, date(2026, 1, 7), "Germany", "Services", "Training", 1, None),
    ]
    for row in rows:
        sheet.append(row)
    notes = workbook.create_sheet("Notes")
    notes.append(["description"])
    notes.append(["Deterministic Node BI acceptance fixture"])
    workbook.save(destination)
    workbook.close()


if __name__ == "__main__":
    repository_root = Path(__file__).resolve().parents[2]
    create_sales_fixture(repository_root / "fixtures" / "excel" / "sales.xlsx")
