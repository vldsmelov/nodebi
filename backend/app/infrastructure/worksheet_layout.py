"""Bounded OOXML inspection without expanding formatting-only worksheet tails."""

from dataclasses import dataclass
from typing import BinaryIO
from zipfile import ZipFile

from defusedxml.ElementTree import iterparse  # type: ignore[import-untyped]
from openpyxl.utils.cell import coordinate_to_tuple, range_boundaries

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


@dataclass(frozen=True)
class SheetStructure:
    rows: int
    columns: int
    merges: tuple[tuple[int, int, int, int], ...]
    missing_formula_results: tuple[str, ...]


def inspect_structure(stream: BinaryIO, worksheet_path: str) -> SheetStructure:
    rows = columns = cells = 0
    merges: list[tuple[int, int, int, int]] = []
    missing: list[str] = []
    with ZipFile(stream) as archive, archive.open(worksheet_path.lstrip("/")) as xml:
        for _, element in iterparse(xml, events=("end",)):
            if element.tag == NS + "c":
                value = element.find(NS + "v")
                inline = element.find(NS + "is")
                formula = element.find(NS + "f")
                if value is not None or inline is not None or formula is not None:
                    coordinate = element.attrib["r"]
                    row, column = coordinate_to_tuple(coordinate)
                    rows, columns, cells = max(rows, row), max(columns, column), cells + 1
                    if columns > 1024:
                        raise ValueError("Worksheet exceeds the 1024-column limit.")
                    if rows > 250_010 or cells > 2_000_000:
                        raise ValueError("Worksheet exceeds the supported row or cell limit.")
                    if formula is not None and (value is None or value.text is None):
                        missing.append(coordinate)
                element.clear()
            elif element.tag == NS + "mergeCell":
                left, top, right, bottom = range_boundaries(element.attrib["ref"])
                if left is None or top is None or right is None or bottom is None:
                    raise ValueError("Invalid merged cell range.")
                merges.append((left, top, right, bottom))
                element.clear()
            elif element.tag == NS + "row":
                element.clear()
    return SheetStructure(rows, columns, tuple(merges), tuple(missing))
