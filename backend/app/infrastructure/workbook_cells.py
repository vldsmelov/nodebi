"""Bounded XLSX cell access and surgical edits; unrelated ZIP parts stay byte-exact."""

import io
import posixpath
import re
from dataclasses import dataclass, field
from typing import Any
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from defusedxml.ElementTree import fromstring  # type: ignore[import-untyped]
from openpyxl.formula.translate import Translator
from openpyxl.styles.numbers import BUILTIN_FORMATS, is_date_format
from openpyxl.utils.cell import coordinate_to_tuple, get_column_letter, range_boundaries
from openpyxl.utils.datetime import MAC_EPOCH, WINDOWS_EPOCH, from_excel

from app.domain.errors import ApplicationError
from app.infrastructure.workbook_colors import display_color, theme_colors

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
CELL = re.compile(r"<(?P<p>(?:\w+:)?)c\b(?P<attrs>[^>]*?)(?:\s*/>|>(?P<body>.*?)</(?P=p)c>)", re.S)
ROW = re.compile(
    r"<(?P<p>(?:\w+:)?)row\b(?P<attrs>[^>]*?)(?:\s*/>|>(?P<body>.*?)</(?P=p)row>)", re.S
)


@dataclass
class BookSheet:
    name: str
    path: str
    cells: dict[str, Any]
    rows: int
    columns: int
    merges: list[tuple[int, int, int, int]]
    protected: bool
    unlocked: set[str]
    hidden_rows: set[int]
    auto_filter: Any
    style_ids: dict[str, int]
    widths: dict[int, float]
    heights: dict[int, float]
    formula_ranges: list[tuple[int, int, int, int]] = field(default_factory=list)
    shared_formulas: dict[str, tuple[str, str]] = field(default_factory=dict)

    def structural_readonly(self, coordinate: str) -> bool:
        row, col = coordinate_to_tuple(coordinate)
        formula = self.cells.get(coordinate)
        formula = formula.find(NS + "f") if formula is not None else None
        return (
            (formula is not None and formula.get("t", "normal") not in {"normal", "shared"})
            or any(
                left <= col <= right and top <= row <= bottom
                for left, top, right, bottom in self.formula_ranges
            )
            or any(
                left <= col <= right and top <= row <= bottom and (row, col) != (top, left)
                for left, top, right, bottom in self.merges
            )
        )

    def readonly(self, coordinate: str) -> bool:
        cell = self.cells.get(coordinate)
        if (self.protected and coordinate not in self.unlocked) or (
            cell is not None and cell.find(NS + "f") is not None
        ):
            return True
        return self.structural_readonly(coordinate)


class WorkbookCells:
    def __init__(self, content: bytes):
        self.content = content
        with ZipFile(io.BytesIO(content)) as archive:
            entries = archive.infolist()
            if (
                len(entries) > 10000
                or len({e.filename for e in entries}) != len(entries)
                or sum(e.file_size for e in entries) > 256 * 1024 * 1024
            ):
                raise ApplicationError(
                    "EDITOR_WORKBOOK_LIMIT", "This workbook exceeds the browser editor limit."
                )
            if any(
                "vbaproject" in e.filename.lower() or e.filename.startswith("_xmlsignatures/")
                for e in entries
            ):
                raise ApplicationError(
                    "EDITOR_ACTIVE_CONTENT",
                    "Signed or macro-enabled workbooks cannot be edited here.",
                )
            book = fromstring(archive.read("xl/workbook.xml"))
            props = book.find(NS + "workbookPr")
            self.epoch = (
                MAC_EPOCH
                if props is not None and props.get("date1904") in {"1", "true"}
                else WINDOWS_EPOCH
            )
            self.names = book.find(NS + "definedNames")
            calculation = book.find(NS + "calcPr")
            self.precision_as_displayed = calculation is not None and calculation.get(
                "fullPrecision"
            ) in {"0", "false"}
            links = fromstring(archive.read("xl/_rels/workbook.xml.rels"))
            paths = {
                r.get("Id"): posixpath.normpath(
                    posixpath.join("xl", r.get("Target", "").lstrip("/"))
                )
                if not r.get("Target", "").startswith("/")
                else r.get("Target", "").lstrip("/")
                for r in links
                if r.get("TargetMode") != "External"
            }
            self.external: dict[tuple[int, str], list[tuple[str, str, str]]] = {}
            for index, reference in enumerate(
                book.findall(NS + "externalReferences/" + NS + "externalReference"), 1
            ):
                link_path = paths.get(reference.get(REL + "id"))
                if not link_path or not link_path.startswith("xl/externalLinks/"):
                    continue
                external = fromstring(archive.read(link_path))
                names = [s.get("val", "") for s in external.iter(NS + "sheetName")]
                for name in names:
                    self.external[index, name] = []
                for data in external.iter(NS + "sheetData"):
                    sheet_id = int(data.get("sheetId", "-1"))
                    if not 0 <= sheet_id < len(names):
                        continue
                    for cached in data.iter(NS + "cell"):
                        self.external[index, names[sheet_id]].append(
                            (
                                cached.attrib["r"],
                                cached.get("t", "n"),
                                cached.findtext(NS + "v", ""),
                            )
                        )
            external_cells = [
                coordinate for values in self.external.values() for coordinate, _, _ in values
            ]
            if len(external_cells) > 2000000 or any(
                row > 250000 or column > 1024
                for row, column in map(coordinate_to_tuple, external_cells)
            ):
                raise ApplicationError(
                    "EDITOR_WORKBOOK_LIMIT",
                    "The linked-value cache exceeds the browser editor limit.",
                )
            self.strings = []
            if "xl/sharedStrings.xml" in archive.namelist():
                self.strings = [
                    "".join(si.itertext())
                    if not si.findall(".//" + NS + "t")
                    else "".join(t.text or "" for t in si.iter(NS + "t"))
                    for si in fromstring(archive.read("xl/sharedStrings.xml"))
                ]
            self.formats: list[str] = []
            self.display_styles: list[dict[str, Any]] = []
            unlocked_styles: set[int] = set()
            if "xl/styles.xml" in archive.namelist():
                styles = fromstring(archive.read("xl/styles.xml"))
                custom = {
                    int(f.get("numFmtId")): f.get("formatCode", "")
                    for f in styles.findall(NS + "numFmts/" + NS + "numFmt")
                }
                self.formats = [
                    custom.get(
                        int(x.get("numFmtId", "0")),
                        BUILTIN_FORMATS.get(int(x.get("numFmtId", "0")), ""),
                    )
                    for x in styles.findall(NS + "cellXfs/" + NS + "xf")
                ]
                unlocked_styles = {
                    index
                    for index, style in enumerate(styles.findall(NS + "cellXfs/" + NS + "xf"))
                    if (protection := style.find(NS + "protection")) is not None
                    and protection.get("locked") in {"0", "false"}
                }
                fonts = styles.findall(NS + "fonts/" + NS + "font")
                fills = styles.findall(NS + "fills/" + NS + "fill")
                borders = styles.findall(NS + "borders/" + NS + "border")
                theme = theme_colors(archive)
                for index, style in enumerate(styles.findall(NS + "cellXfs/" + NS + "xf")):
                    font_id, fill_id = int(style.get("fontId", "0")), int(style.get("fillId", "0"))
                    font = fonts[font_id] if font_id < len(fonts) else None
                    fill = fills[fill_id] if fill_id < len(fills) else None
                    border_id = int(style.get("borderId", "0"))
                    border = borders[border_id] if border_id < len(borders) else None
                    alignment = style.find(NS + "alignment")

                    def attribute(node: Any, child: str, default: str) -> str:
                        item = node.find(NS + child) if node is not None else None
                        return item.get("val", default) if item is not None else default

                    def color(node: Any) -> str | None:
                        return display_color(node, theme)

                    def font_flag(node: Any, child: str) -> bool:
                        item = node.find(NS + child) if node is not None else None
                        return item is not None and item.get("val", "1") in {"1", "true"}

                    self.display_styles.append(
                        {
                            "font": attribute(font, "name", "Arial")[:100],
                            "size": max(6, min(72, float(attribute(font, "sz", "11")))),
                            "bold": font_flag(font, "b"),
                            "italic": font_flag(font, "i"),
                            "color": color(font.find(NS + "color")) if font is not None else None,
                            "background": color(fill.find(NS + "patternFill/" + NS + "fgColor"))
                            if fill is not None
                            else None,
                            "alignment": alignment.get("horizontal", "general")
                            if alignment is not None
                            else "general",
                            "wrap": alignment is not None
                            and alignment.get("wrapText") in {"1", "true"},
                            "number_format": self.formats[index],
                            "borders": {
                                side: {
                                    "line": edge.attrib["style"],
                                    "color": color(edge.find(NS + "color")) or "#000000",
                                }
                                for side in ("top", "right", "bottom", "left")
                                if border is not None
                                and (edge := border.find(NS + side)) is not None
                                and edge.get("style")
                            },
                        }
                    )
            self.sheets: dict[str, BookSheet] = {}
            total = 0
            for descriptor in book.findall(NS + "sheets/" + NS + "sheet"):
                path = paths.get(descriptor.get(REL + "id"))
                if not path or not path.startswith("xl/worksheets/"):
                    raise ApplicationError(
                        "EDITOR_WORKBOOK_INVALID",
                        "The workbook has an unsupported worksheet reference.",
                    )
                root = fromstring(archive.read(path))
                cells = {
                    c.attrib["r"]: c
                    for c in root.iter(NS + "c")
                    if any(c.find(NS + n) is not None for n in ("v", "is", "f"))
                }
                positions = [coordinate_to_tuple(c) for c in cells]
                rows = max((p[0] for p in positions), default=1)
                columns = max((p[1] for p in positions), default=1)
                total += rows * columns
                if columns > 1024 or rows > 250000 or total > 2000000:
                    raise ApplicationError(
                        "EDITOR_WORKBOOK_LIMIT", "This workbook exceeds the browser editor limit."
                    )
                merges = []
                for merge in root.iter(NS + "mergeCell"):
                    left, top, right, bottom = range_boundaries(merge.attrib["ref"])
                    if left is None or top is None or right is None or bottom is None:
                        raise ApplicationError(
                            "EDITOR_WORKBOOK_INVALID", "Invalid merged cell range."
                        )
                    merges.append((left, top, right, bottom))
                self.sheets[descriptor.attrib["name"]] = BookSheet(
                    descriptor.attrib["name"],
                    path,
                    cells,
                    rows,
                    columns,
                    merges,
                    root.find(NS + "sheetProtection") is not None,
                    {
                        c.attrib["r"]
                        for c in root.iter(NS + "c")
                        if int(c.get("s", "0")) in unlocked_styles
                    },
                    {
                        int(r.attrib["r"])
                        for r in root.iter(NS + "row")
                        if r.get("hidden") in {"1", "true"}
                    },
                    root.find(NS + "autoFilter")
                    if (properties := root.find(NS + "sheetPr")) is not None
                    and properties.get("filterMode") in {"1", "true"}
                    else None,
                    {
                        c.attrib["r"]: int(c.get("s", "0"))
                        for c in root.iter(NS + "c")
                        if coordinate_to_tuple(c.attrib["r"])[0] <= rows
                        and coordinate_to_tuple(c.attrib["r"])[1] <= columns
                    },
                    {
                        column - 1: max(40, min(800, float(c.get("width", "13")) * 7 + 5))
                        for c in root.findall(NS + "cols/" + NS + "col")
                        for column in range(
                            max(1, int(c.get("min", "1"))), min(columns, int(c.get("max", "1"))) + 1
                        )
                    },
                    {
                        int(r.attrib["r"]) - 1: max(20, min(200, float(r.attrib["ht"]) * 4 / 3))
                        for r in root.iter(NS + "row")
                        if "ht" in r.attrib and int(r.attrib["r"]) <= rows
                    },
                    [
                        finite_range(f.attrib["ref"])
                        for f in root.iter(NS + "f")
                        if f.get("t", "normal") not in {"normal", "shared"} and "ref" in f.attrib
                    ],
                    resolved_shared_formulas(cells),
                )

    def value(self, cell: Any) -> str:
        if cell is None:
            return ""
        kind = cell.get("t")
        value = cell.findtext(NS + "v", "")
        if kind == "s":
            return self.strings[int(value)] if value else ""
        if kind == "inlineStr":
            return "".join(t.text or "" for t in cell.iter(NS + "t"))
        if kind == "b":
            return "true" if value == "1" else "false"
        style = int(cell.get("s", "0"))
        if (
            value
            and kind in {None, "n"}
            and style < len(self.formats)
            and is_date_format(self.formats[style])
        ):
            try:
                return str(from_excel(float(value), self.epoch).isoformat())
            except (ValueError, OverflowError):
                pass
        return str(value)

    def patched(self, replacements: dict[str, dict[str, tuple[str, str, bool]]]) -> bytes:
        """Each replacement is (OOXML type, serialized value, keep original formula)."""
        output = io.BytesIO()
        with (
            ZipFile(io.BytesIO(self.content)) as incoming,
            ZipFile(output, "w", ZIP_DEFLATED) as outgoing,
        ):
            for entry in incoming.infolist():
                content = incoming.read(entry.filename)
                if entry.filename in replacements:
                    content = patch_sheet(content, replacements[entry.filename])
                outgoing.writestr(entry, content)
        return output.getvalue()


def patch_sheet(content: bytes, changes: dict[str, tuple[str, str, bool]]) -> bytes:
    xml = content.decode("utf-8")
    remaining = dict(changes)

    def cell_xml(coord: str, prefix: str, attrs: str, body: str) -> str:
        kind, value, formula = remaining.pop(coord)
        attrs = re.sub(r'\s+t\s*=\s*["\'][^"\']*["\']', "", attrs)
        body = re.sub(
            r"<(?:\w+:)?(?:v|is)\b[^>]*(?:/>|>.*?</(?:\w+:)?(?:v|is)>)", "", body, flags=re.S
        )
        if not formula:
            body = re.sub(r"<(?:\w+:)?f\b[^>]*(?:/>|>.*?</(?:\w+:)?f>)", "", body, flags=re.S)
        if kind == "formula":
            payload = f"<{prefix}f>{escape(value.removeprefix('='))}</{prefix}f>"
            return f"<{prefix}c{attrs}>{body}{payload}</{prefix}c>"
        if kind == "inlineStr":
            payload = (
                f'<{prefix}is><{prefix}t xml:space="preserve">'
                f"{escape(value)}</{prefix}t></{prefix}is>"
            )
        else:
            payload = f"<{prefix}v>{escape(value)}</{prefix}v>" if value or formula else ""
        return f'<{prefix}c{attrs} t="{kind}">{body}{payload}</{prefix}c>'

    def replace(match: re.Match[str]) -> str:
        coord = re.search(r'\br\s*=\s*["\']([A-Z]+[0-9]+)["\']', match["attrs"])
        if coord and coord[1] in remaining:
            return cell_xml(coord[1], match["p"], match["attrs"], match["body"] or "")
        return match[0]

    xml = CELL.sub(replace, xml)

    # Fill empty cells inside existing rows, keeping coordinate order and row formatting.
    def fill_row(match: re.Match[str]) -> str:
        row_attr = re.search(r'\br\s*=\s*["\']([0-9]+)["\']', match["attrs"])
        if row_attr is None:
            return match[0]
        row = int(row_attr[1])
        coordinates = sorted(
            (c for c in remaining if coordinate_to_tuple(c)[0] == row), key=coordinate_to_tuple
        )
        body = match["body"] or ""
        for coordinate in coordinates:
            addition = cell_xml(coordinate, match["p"], f' r="{coordinate}"', "")
            following = next(
                (
                    c
                    for c in CELL.finditer(body)
                    if (a := re.search(r'\br\s*=\s*["\']([A-Z]+[0-9]+)["\']', c["attrs"]))
                    and coordinate_to_tuple(a[1])[1] > coordinate_to_tuple(coordinate)[1]
                ),
                None,
            )
            position = following.start() if following else len(body)
            body = body[:position] + addition + body[position:]
        return f"<{match['p']}row{match['attrs']}>{body}</{match['p']}row>"

    xml = ROW.sub(fill_row, xml)
    if remaining:
        # Existing worksheets can have entirely blank rows inside their populated extent.
        data = re.search(
            r"<(?P<p>(?:\w+:)?)sheetData\b[^>]*>(?P<body>.*?)</(?P=p)sheetData>", xml, re.S
        )
        if data is None:
            raise ApplicationError(
                "EDITOR_WORKBOOK_INVALID", "The worksheet has no editable cell area."
            )
        body = data["body"]
        for row in sorted({coordinate_to_tuple(c)[0] for c in remaining}):
            coords = sorted(
                (c for c in remaining if coordinate_to_tuple(c)[0] == row), key=coordinate_to_tuple
            )
            addition = (
                f'<{data["p"]}row r="{row}">'
                + "".join(cell_xml(c, data["p"], f' r="{c}"', "") for c in coords)
                + f"</{data['p']}row>"
            )
            following = next(
                (
                    r
                    for r in ROW.finditer(body)
                    if (a := re.search(r'\br\s*=\s*["\']([0-9]+)["\']', r["attrs"]))
                    and int(a[1]) > row
                ),
                None,
            )
            position = following.start() if following else len(body)
            body = body[:position] + addition + body[position:]
        xml = xml[: data.start("body")] + body + xml[data.end("body") :]
    return xml.encode("utf-8")


def address(row: int, column: int) -> str:
    return f"{get_column_letter(column + 1)}{row + 1}"


def finite_range(value: str) -> tuple[int, int, int, int]:
    left, top, right, bottom = range_boundaries(value)
    if left is None or top is None or right is None or bottom is None:
        raise ApplicationError("EDITOR_WORKBOOK_INVALID", "Invalid formula range.")
    return left, top, right, bottom


def resolved_shared_formulas(cells: dict[str, Any]) -> dict[str, tuple[str, str]]:
    masters = {
        f.get("si"): (coordinate, "=" + f.text)
        for coordinate, cell in cells.items()
        if (f := cell.find(NS + "f")) is not None and f.get("t") == "shared" and f.text
    }
    resolved = {}
    for coordinate, cell in cells.items():
        formula = cell.find(NS + "f")
        if formula is None or formula.get("t") != "shared":
            continue
        group = formula.get("si", "")
        if group not in masters:
            raise ApplicationError("EDITOR_WORKBOOK_INVALID", "Invalid shared formula group.")
        origin, text = masters[group]
        try:
            translated = Translator(text, origin=origin).translate_formula(coordinate)
        except Exception as error:
            raise ApplicationError(
                "EDITOR_WORKBOOK_INVALID", "Invalid shared formula group."
            ) from error
        resolved[coordinate] = (group, translated)
    return resolved
