"""Materialize the compact input as three typed Node BI import tables."""
import csv
from decimal import Decimal
from io import StringIO

from prepare_snapshot import (
    FORMAT, METRICS, MONTHS, PERIODS, SECTIONS, SPLIT_FIELDS, difference, read_values, summaries,
)

MONTH_NAMES = "Январь Февраль Март Апрель Май Июнь Июль Август Сентябрь".split()


def tables(package):
    transfer = package["transfer"]
    if transfer["format"] != FORMAT or not 1 <= len(transfer["companies"]) <= 9:
        raise ValueError("Unsupported company data format")
    companies = [(item["label"], read_values(item["values"])) for item in transfer["companies"]]
    if len({label for label, _ in companies}) != len(companies):
        raise ValueError("Company labels must be distinct")
    source_group = read_values(transfer["group"], group=True)
    fields = package["tables"]
    expected = {"monthly", "summary", "detail"}
    if set(fields) != expected:
        raise ValueError("Expected three prepared tables")
    result = {key: [] for key in expected}
    group_mask = (1 << len(companies)) - 1
    for mask in range(group_mask + 1):
        flags = tuple(bool(mask & (1 << i)) for i in range(len(companies)))
        chosen = [company for company, flag in zip(companies, flags, strict=True) if flag] or companies
        group = mask in {0, group_mask}
        label = "Все ДО" if group else chosen[0][0] if len(chosen) == 1 else "Выбрано: " + ", ".join(name for name, _ in chosen)
        values = summaries(chosen, source_group if group else None)
        for i, month in enumerate(MONTHS):
            row = [f"{i + 1:02d} · {MONTH_NAMES[i]}"]
            for key, _, _ in fields["monthly"]["fields"][1:]:
                metric, scenario = key.rsplit("_", 1)
                row.append(values[month][metric][scenario == "fact"])
            result["monthly"].append((*flags, *row))
        for section, (_, keys) in zip(("finance", "cash", "taxes"), SECTIONS, strict=True):
            for key in keys:
                row = [section, label, METRICS[key]]
                for period in PERIODS[-2:]:
                    plan, actual = values[period][key]
                    row.extend((plan, actual, difference(actual, plan)))
                result["summary"].append((*flags, *row))
        for name, source in chosen:
            ytd = source["year_to_date"]
            paid = ytd["tax"][1]
            federal, regional = (ytd[key][1] for key in SPLIT_FIELDS)
            rest = difference(paid, (federal or Decimal(0)) + (regional or Decimal(0)))
            result["detail"].append((*flags, name, *ytd["revenue"], *ytd["profit"], paid, federal, regional, rest))
    return result


def csv_bytes(fields, rows):
    buffer = StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow([label for _, label, _ in fields])
    for row in rows:
        if len(row) != len(fields):
            raise ValueError("Column count does not match the import profile")
        writer.writerow([str(value).lower() if isinstance(value, bool) else value for value in row])
    return buffer.getvalue().encode("utf-8")
