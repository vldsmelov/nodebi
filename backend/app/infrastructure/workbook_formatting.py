"""Append cell styles and patch style references without rewriting existing OOXML assets."""

import copy
import io
import re
from xml.etree.ElementTree import Element, SubElement, tostring
from zipfile import ZIP_DEFLATED, ZipFile

from defusedxml.ElementTree import fromstring  # type: ignore[import-untyped]

from app.domain.errors import ApplicationError
from app.domain.workbook_formats import CellFormatPatch
from app.infrastructure.workbook_cells import CELL, NS, WorkbookCells


def format_book(content: bytes, changes: dict[str, dict[str, CellFormatPatch]]) -> bytes:
    if not any(changes.values()):
        return content
    package = WorkbookCells(content)
    output = io.BytesIO()
    with ZipFile(io.BytesIO(content)) as incoming, ZipFile(output, "w", ZIP_DEFLATED) as outgoing:
        if "xl/styles.xml" not in incoming.namelist():
            raise ApplicationError(
                "EDITOR_FORMAT_UNAVAILABLE", "This workbook has no editable styles."
            )
        original = incoming.read("xl/styles.xml")
        root = fromstring(original)
        fonts, fills, xfs = (
            list(element) if (element := root.find(NS + name)) is not None else []
            for name in ("fonts", "fills", "cellXfs")
        )
        if not fonts or not fills or not xfs:
            raise ApplicationError(
                "EDITOR_FORMAT_UNAVAILABLE", "This workbook has no editable styles."
            )
        additions: dict[str, list[Element]] = {"fonts": [], "fills": [], "cellXfs": []}
        cache: dict[tuple[int, str], int] = {}
        references: dict[str, dict[str, int]] = {}
        for name, cells in changes.items():
            sheet = package.sheets[name]
            for coordinate, patch in cells.items():
                fields = patch.model_dump(exclude_none=True)
                if not fields:
                    continue
                index = sheet.style_ids.get(coordinate, 0)
                key = index, patch.model_dump_json(exclude_none=True)
                if key not in cache:
                    style = copy.deepcopy(xfs[index])
                    if any(k in fields for k in ("bold", "italic", "color", "size")):
                        font = copy.deepcopy(fonts[int(style.get("fontId", "0"))])
                        for key_name, tag in (
                            ("bold", "b"),
                            ("italic", "i"),
                            ("size", "sz"),
                            ("color", "color"),
                        ):
                            if key_name not in fields:
                                continue
                            for old in font.findall(NS + tag):
                                font.remove(old)
                            value = fields[key_name]
                            if key_name in {"bold", "italic"}:
                                if value:
                                    SubElement(font, NS + tag)
                            elif key_name == "size":
                                SubElement(font, NS + tag, {"val": str(value)})
                            else:
                                SubElement(
                                    font,
                                    NS + tag,
                                    {"auto": "1"}
                                    if value == "auto"
                                    else {"rgb": "FF" + str(value)[1:].upper()},
                                )
                        style.set("fontId", str(len(fonts) + len(additions["fonts"])))
                        style.set("applyFont", "1")
                        additions["fonts"].append(font)
                    if "background" in fields:
                        fill = Element(NS + "fill")
                        pattern = SubElement(
                            fill,
                            NS + "patternFill",
                            {"patternType": "none" if patch.background == "none" else "solid"},
                        )
                        if patch.background != "none":
                            SubElement(
                                pattern,
                                NS + "fgColor",
                                {"rgb": "FF" + str(patch.background)[1:].upper()},
                            )
                            SubElement(pattern, NS + "bgColor", {"indexed": "64"})
                        style.set("fillId", str(len(fills) + len(additions["fills"])))
                        style.set("applyFill", "1")
                        additions["fills"].append(fill)
                    if "alignment" in fields or "wrap" in fields:
                        alignment = style.find(NS + "alignment")
                        if alignment is None:
                            alignment = Element(NS + "alignment")
                            # Alignment precedes protection/extLst in the cellXf contract.
                            position = next(
                                (
                                    i
                                    for i, child in enumerate(style)
                                    if child.tag in {NS + "protection", NS + "extLst"}
                                ),
                                len(style),
                            )
                            style.insert(position, alignment)
                        if patch.alignment is not None:
                            alignment.set("horizontal", patch.alignment)
                        if patch.wrap is not None:
                            alignment.set("wrapText", "1" if patch.wrap else "0")
                        style.set("applyAlignment", "1")
                    cache[key] = len(xfs) + len(additions["cellXfs"])
                    additions["cellXfs"].append(style)
                references.setdefault(sheet.path, {})[coordinate] = cache[key]
        if len(xfs) + len(additions["cellXfs"]) > 60000:
            raise ApplicationError(
                "EDITOR_FORMAT_LIMIT", "The workbook contains too many cell formats."
            )
        xml = original.decode("utf-8")
        for name, nodes in additions.items():
            if nodes:
                xml = append_styles(
                    xml,
                    name,
                    nodes,
                    {"fonts": len(fonts), "fills": len(fills), "cellXfs": len(xfs)}[name],
                )
        for item in incoming.infolist():
            data = incoming.read(item.filename)
            if item.filename == "xl/styles.xml":
                data = xml.encode("utf-8")
            elif item.filename in references:
                data = format_sheet(data, references[item.filename])
            outgoing.writestr(item, data)
    return output.getvalue()


def append_styles(xml: str, name: str, nodes: list[Element], count: int) -> str:
    pattern = re.compile(
        rf"<(?P<p>(?:\w+:)?){name}\b(?P<a>[^>]*?)(?:\s*/>|>(?P<b>.*?)</(?P=p){name}>)", re.S
    )
    match = pattern.search(xml)
    if match is None:
        raise ApplicationError("EDITOR_FORMAT_UNAVAILABLE", "This workbook has no editable styles.")
    # Count actual records; preserve every original byte of the original records and namespaces.
    body = match["b"] or ""
    attrs = re.sub(r'\s+count\s*=\s*["\'][^"\']*["\']', "", match["a"])
    addition = "".join(tostring(node, encoding="unicode") for node in nodes)
    replacement = (
        f'<{match["p"]}{name}{attrs} count="{count + len(nodes)}">'
        f"{body}{addition}</{match['p']}{name}>"
    )
    return xml[: match.start()] + replacement + xml[match.end() :]


def format_sheet(content: bytes, references: dict[str, int]) -> bytes:
    from app.infrastructure.workbook_cells import patch_sheet

    # Missing formatted cells are real empty cells; no value or formula is rewritten.
    present = {
        m[1]
        for m in re.finditer(
            r'<(?:\w+:)?c\b[^>]*\br\s*=\s*["\']([A-Z]+[0-9]+)["\']', content.decode("utf-8")
        )
    }
    missing = {c: ("inlineStr", "", False) for c in references.keys() - present}
    if missing:
        content = patch_sheet(content, missing)

    def replace(match: re.Match[str]) -> str:
        coordinate = re.search(r'\br\s*=\s*["\']([A-Z]+[0-9]+)["\']', match["attrs"])
        if coordinate is None or coordinate[1] not in references:
            return match[0]
        attrs = re.sub(r'\s+s\s*=\s*["\'][^"\']*["\']', "", match["attrs"])
        attrs += f' s="{references[coordinate[1]]}"'
        return (
            f"<{match['p']}c{attrs}/>"
            if match["body"] is None
            else f"<{match['p']}c{attrs}>{match['body']}</{match['p']}c>"
        )

    return CELL.sub(replace, content.decode("utf-8")).encode("utf-8")
