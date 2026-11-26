"""Prepare all company selections from the compact consolidation handoff."""

from decimal import Decimal, ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_EVEN
from itertools import chain
import re

FORMAT = "nodebi-consolidation-demo-v1"
MONTHS = tuple(f"m{number:02d}" for number in range(1, 10))
PERIODS = (*MONTHS, "quarter", "year_to_date")
MONTH_LABELS = "Янв Фев Мар Апр Май Июн Июл Авг Сен".split()
SCALE = Decimal(1_000_000)
DECIMAL = re.compile(r"-?(?:0|[1-9][0-9]{0,17})\.[0-9]{2}\Z")
METRICS = {
    "revenue": "Выручка", "profit": "Чистая прибыль / убыток", "opening": "Остаток на начало",
    "operating": "Операционный поток", "investment": "Инвестиционный поток", "financing": "Финансовый поток",
    "closing": "Остаток на конец", "tax": "Налоговые платежи по БДДС",
    "federal": "Федеральный бюджет · раскрытая часть", "regional": "Региональный бюджет · раскрытая часть",
    "unallocated": "Без разбивки по бюджетам",
}
MONTH_FIELDS = ("revenue", "profit", "operating", "investment", "financing", "closing", "tax")
FLOW_FIELDS = ("operating", "investment", "financing")
SUMMARY_FIELDS = ("revenue", "profit", "opening", *FLOW_FIELDS, "closing", "tax")
SPLIT_FIELDS = ("federal", "regional")
SECTIONS = (
    ("Финансовые результаты · итоги из БДР", ("revenue", "profit")),
    ("Денежные потоки и остатки · итоги из БДДС", ("opening", *FLOW_FIELDS, "closing")),
    ("Налоговые платежи и раскрытая разбивка по бюджетам", ("tax", *SPLIT_FIELDS, "unallocated")),
)
CHARTS = [
    dict(title=title, kind=kind, section=section, wide=wide)
    for title, kind, section, wide in (
        ("Выручка по месяцам, млн", "bar", "finance", False),
        ("Чистая прибыль по месяцам, млн", "bar", "finance", False),
        ("Чистая прибыль по компаниям · отклонение от плана за 9 месяцев, млн", "horizontal", "finance", True),
        ("Чистые денежные потоки · факт, млн", "bar", "cash", False),
        ("Остаток денег на конец месяца, млн", "line", "cash", False),
        ("Чистые денежные потоки по видам деятельности за 9 месяцев, млн", "horizontal", "cash", True),
        ("Налоговые платежи по месяцам, млн", "bar", "taxes", False),
        ("Налоговые платежи по компаниям за 9 месяцев, млн", "horizontal", "taxes", False),
    )
]


def amount(value):
    if value is None:
        return None
    if not isinstance(value, str) or not DECIMAL.fullmatch(value):
        raise ValueError("Expected an exact decimal string with two places or null")
    return Decimal(value)


def read_values(values, group=False):
    if not isinstance(values, dict) or set(values) != set(PERIODS):
        raise ValueError("Unexpected periods in transfer file")
    parsed = {}
    for period in PERIODS:
        row = values[period]
        fields = MONTH_FIELDS if period in MONTHS else SUMMARY_FIELDS if group else (*SUMMARY_FIELDS, *SPLIT_FIELDS)
        if not isinstance(row, dict) or set(row) != set(fields):
            raise ValueError("Unexpected fields in a transfer period")
        parsed[period] = {}
        for key, pair in row.items():
            if not isinstance(pair, list) or len(pair) != 2:
                raise ValueError("Each metric must contain a plan and actual pair")
            if period in MONTHS and key in FLOW_FIELDS and pair[0] is not None:
                raise ValueError("Only actual monthly flows are used")
            parsed[period][key] = tuple(amount(item) for item in pair)
    return parsed


def add(values, partial=False):
    values = tuple(values)
    present = [value for value in values if value is not None]
    if not present or (not partial and len(present) != len(values)):
        return None
    return sum(present, Decimal(0))


def difference(value, benchmark):
    return value - benchmark if value is not None and benchmark is not None else None


def format_amount(value, decimals=2):
    if value is None:
        return "—"
    rounded = value.quantize(Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_EVEN)
    return f"{rounded or abs(rounded):,.{decimals}f}".replace(",", "\u202f").replace(".", ",")


def chart(labels, *series):
    data = [(label, [None if value is None else value / SCALE for value in values]) for label, values in series]
    points = [value for _, values in data for value in values if value is not None] + [Decimal(0)]
    low, high = min(points), max(points)
    interval = (high - low) / 4 or Decimal(1)
    magnitude = Decimal(1).scaleb(interval.adjusted())
    step = next(magnitude * Decimal(factor) for factor in ("1", "2", "2.5", "5", "10") if magnitude * Decimal(factor) >= interval)
    low = (low / step).to_integral_value(rounding=ROUND_FLOOR) * step
    high = (high / step).to_integral_value(rounding=ROUND_CEILING) * step
    high = high if high > low else low + step
    ticks = [low + step * index for index in range(int((high - low) / step) + 1)]
    decimals = min(3, max(0, -step.normalize().as_tuple().exponent))
    return {
        "labels": list(labels), "domain": [float(low), float(high)],
        "ticks": [[float(tick), format_amount(tick, decimals)] for tick in ticks],
        "series": [{"label": label, "values": [None if value is None else float(value) for value in values]} for label, values in data],
    }


def summaries(picked, group):
    result = {}
    for period in PERIODS:
        fields = MONTH_FIELDS if period in MONTHS else SUMMARY_FIELDS
        combined = dict(group[period]) if group else {
            key: tuple(add(row[period][key][scenario] for _, row in picked) for scenario in (0, 1)) for key in fields
        }
        if period not in MONTHS:
            for key in SPLIT_FIELDS:
                combined[key] = tuple(add((row[period][key][scenario] for _, row in picked), partial=True) for scenario in (0, 1))
            combined["unallocated"] = tuple(
                difference(combined["tax"][scenario], (combined["federal"][scenario] or Decimal(0)) + (combined["regional"][scenario] or Decimal(0)))
                for scenario in (0, 1)
            )
        result[period] = combined
    return result


def make_view(combined, picked, label):
    nine = combined["year_to_date"]
    cards = []
    for key, title, subtitle in (
        ("revenue", "Выручка", "Факт за 9 месяцев, млн"), ("profit", "Чистая прибыль", "Факт за 9 месяцев, млн"),
        ("closing", "Остаток денег", "На конец сентября, млн"), ("tax", "Налоговые платежи", "Факт по БДДС за 9 месяцев, млн"),
    ):
        value = nine[key][1]
        cards.append(dict(title=title, value=format_amount(None if value is None else value / SCALE, 1), subtitle=subtitle))

    def monthly(key, scenario):
        return [combined[period][key][scenario] for period in MONTHS]

    def plan_fact(key):
        return chart(MONTH_LABELS, ("План", monthly(key, 0)), ("Факт", monthly(key, 1)))

    company_values = [(name, rows["year_to_date"]) for name, rows in picked]

    def rank(values):
        return sorted(values, key=lambda item: (item[1] is not None, item[1] or Decimal(0)), reverse=True)

    profit = rank((name, difference(data["profit"][1], data["profit"][0])) for name, data in company_values)
    taxes = rank((name, data["tax"][1]) for name, data in company_values)
    charts = [
        plan_fact("revenue"), plan_fact("profit"),
        chart([name for name, _ in profit], ("Факт минус план", [value for _, value in profit])),
        chart(MONTH_LABELS, ("Операционный", monthly("operating", 1)), ("Инвестиционный", monthly("investment", 1)), ("Финансовый", monthly("financing", 1))),
        plan_fact("closing"),
        chart([METRICS[key] for key in FLOW_FIELDS], ("План", [nine[key][0] for key in FLOW_FIELDS]), ("Факт", [nine[key][1] for key in FLOW_FIELDS])),
        plan_fact("tax"), chart([name for name, _ in taxes], ("Факт по БДДС", [value for _, value in taxes])),
    ]

    def summary_row(key):
        numbers = []
        for period in ("quarter", "year_to_date"):
            plan, actual = combined[period][key]
            numbers.extend((plan, actual, difference(actual, plan)))
        return [METRICS[key], *map(format_amount, numbers)]

    headers = ["Показатель", "3 кв. · план", "3 кв. · факт", "3 кв. · факт − план", "9 мес. · план", "9 мес. · факт", "9 мес. · факт − план"]
    tables = [dict(title=title, headers=headers, rows=[summary_row(key) for key in keys]) for title, keys in SECTIONS]
    tables.append(dict(
        title="Выручка и чистая прибыль по компаниям · 9 месяцев",
        headers=["Компания", "Выручка · план", "Выручка · факт", "Чистая прибыль · план", "Чистая прибыль · факт"],
        rows=[[name, *map(format_amount, chain(data["revenue"], data["profit"]))] for name, data in company_values],
    ))

    def tax_row(name, data):
        total, federal, regional = (data[key][1] for key in ("tax", *SPLIT_FIELDS))
        undisclosed = difference(total, (federal or Decimal(0)) + (regional or Decimal(0)))
        return [name, *map(format_amount, (total, federal, regional, undisclosed))]

    tables.append(dict(
        title="Налоговые платежи по компаниям · 9 месяцев",
        headers=["Компания", "Налоговые платежи", "Федеральный бюджет · раскрытая часть", "Региональный бюджет · раскрытая часть", "Без разбивки по бюджетам"],
        rows=[tax_row(name, data) for name, data in company_values],
    ))
    return dict(scope=label, cards=cards, charts=charts, tables=tables)


def prepare(transfer):
    if not isinstance(transfer, dict) or set(transfer) != {"format", "title", "subtitle", "group", "companies"} or transfer["format"] != FORMAT:
        raise ValueError("Unsupported consolidation transfer format")
    for key in ("title", "subtitle"):
        if not isinstance(transfer[key], str) or not 1 <= len(transfer[key]) <= 160:
            raise ValueError("Missing or oversized report label")
    if not isinstance(transfer["companies"], list) or not 1 <= len(transfer["companies"]) <= 9:
        raise ValueError("Expected one to nine companies")
    companies = []
    for item in transfer["companies"]:
        if not isinstance(item, dict) or set(item) != {"label", "values"} or not isinstance(item["label"], str) or not 1 <= len(item["label"]) <= 50:
            raise ValueError("Invalid company label")
        companies.append((item["label"], read_values(item["values"])))
    labels = [name for name, _ in companies]
    if len(set(labels)) != len(labels):
        raise ValueError("Company labels must be distinct")
    group = read_values(transfer["group"], group=True)
    last = (1 << len(companies)) - 1
    views = {}
    for mask in range(last + 1):
        if mask == last:
            views[str(mask)] = views["0"]
            continue
        picked = [company for index, company in enumerate(companies) if mask & (1 << index)] or companies
        label = "Все ДО" if not mask else picked[0][0] if len(picked) == 1 else "Выбрано: " + ", ".join(name for name, _ in picked)
        views[str(mask)] = make_view(summaries(picked, group if not mask else None), picked, label)
    return dict(title=transfer["title"], subtitle=transfer["subtitle"], companies=labels, charts=CHARTS, views=views)
