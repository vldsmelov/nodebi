"""Public synthetic workbooks: same product, different monthly prices.

Run with backend/.venv/Scripts/python.exe fixtures/build_multikey_demo.py.
Expected inner Join on Product + Month: Revenue 20 and 60; unmatched C is excluded.
Joining only Product instead would multiply rows and produce a wrong total of 150.
"""
from pathlib import Path

from openpyxl import Workbook

root = Path(__file__).parent / "excel"
for name, sheet, rows in [
    ("multikey-orders", "Orders", [
        ["Product", "Month", "Quantity"], ["A", "2026-01", 2],
        ["A", "2026-02", 3], ["C", "2026-01", 9],
    ]),
    ("multikey-prices", "Prices", [
        ["Product", "Month", "Price"], ["A", "2026-01", 10], ["A", "2026-02", 20],
    ]),
]:
    workbook = Workbook()
    worksheet = workbook.active
    assert worksheet is not None
    worksheet.title = sheet
    for row in rows:
        worksheet.append(row)
    workbook.save(root / f"{name}.xlsx")
