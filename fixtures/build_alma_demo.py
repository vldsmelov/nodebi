"""Public synthetic books. No data or code from a customer's report is embedded."""

import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from openpyxl import Workbook

ROOT = Path(__file__).parent / "excel"


def build() -> None:
    ROOT.mkdir(exist_ok=True)
    books = {}
    headers = {
        "accounting": ["Document", "Item", "Date", "Account", "BU", "NU", "Bucket", "Period"],
        "realization": ["Document", "Item", "Project", "Direction"],
        "cost": ["Document", "Item", "Cost"],
        "plan": ["Period", "Plan", "Forecast"],
    }
    for name, labels in headers.items():
        book = Workbook()
        sheet = book.active
        sheet.title = name.title()
        if name == "accounting":
            sheet.append(["Synthetic example - amounts are illustrative"])
            sheet.append(["Header below; one explanatory row and one total are excluded"])
        sheet.append(labels)
        if name == "accounting":
            sheet.append(["Explanatory row"])
        books[name] = book
    expected = []
    # Each year starts with a loss; loss carryforward must reset at the new year.
    for year in [2025, 2026]:
        carry = {"standard": Decimal(0), "reduced": Decimal(0)}
        for month, revenue in [(1, 80), (2, 160), (3, 200)]:
            totals = {
                name: Decimal(0)
                for name in [
                    "Revenue BU",
                    "Revenue NU",
                    "Cost",
                    "Commercial",
                    "Management",
                    "Other income",
                    "Other expense",
                    "Operating",
                    "PBT",
                    "Tax",
                    "Net profit",
                ]
            }
            for bucket, factor, rate in [
                ("standard", 1, Decimal("0.25")),
                ("reduced", 2, Decimal("0.02")),
            ]:
                document = f"{year}-{month:02}-{bucket}"
                # Revenue: two items sharing a document (single-key joins are wrong).
                for item, share in [(1, Decimal("0.4")), (2, Decimal("0.6"))]:
                    amount = Decimal(revenue * factor) * share
                    books["accounting"].active.append(
                        [
                            document,
                            item,
                            date(year, month, 1),
                            "90.01",
                            float(amount),
                            float(amount + 2),
                            bucket,
                            f"{year}-{month:02}",
                        ]
                    )
                    books["realization"].active.append(
                        [document, item, "Project A" if item == 1 else "Project B", bucket]
                    )
                    books["cost"].active.append(
                        [document, item, float(Decimal(90 * factor) * share)]
                    )
                for item, account, amount in [
                    (3, "44", -10 * factor),
                    (4, "26", -5 * factor),
                    (5, "91.01", 3 * factor),
                    (6, "91.02", -2 * factor),
                ]:
                    books["accounting"].active.append(
                        [
                            document,
                            item,
                            date(year, month, 1),
                            account,
                            amount,
                            amount,
                            bucket,
                            f"{year}-{month:02}",
                        ]
                    )
                pbt = Decimal((revenue - 104) * factor)
                taxable = max(carry[bucket] + pbt, Decimal(0))
                carry[bucket] = min(carry[bucket] + pbt, Decimal(0))
                tax = -taxable * rate
                values = [
                    revenue * factor,
                    revenue * factor + 4,
                    -90 * factor,
                    -10 * factor,
                    -5 * factor,
                    3 * factor,
                    -2 * factor,
                    (revenue - 105) * factor,
                    pbt,
                    tax,
                    pbt + tax,
                ]
                for name, value in zip(totals, values, strict=True):
                    totals[name] += Decimal(value)
            period = f"{year}-{month:02}"
            plan = 300 if month != 2 else None
            forecast = 350 if month != 2 else None
            if month != 2:
                books["plan"].active.append([period, plan, forecast])
            expected.append(
                {
                    "Period": period,
                    **{key: float(value) for key, value in totals.items()},
                    "Plan": plan,
                    "Forecast": forecast,
                }
            )
    books["accounting"].active.append(["Total (excluded)", None, None, None, 999999])
    for name, book in books.items():
        book.save(ROOT / f"alma-{name}.xlsx")
    (ROOT / "alma-expected.json").write_text(json.dumps(expected, indent=2), encoding="utf-8")


if __name__ == "__main__":
    build()
