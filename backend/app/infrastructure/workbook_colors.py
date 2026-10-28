"""Resolve OOXML display colours without rewriting workbook formatting."""

import colorsys
import re
from typing import Any
from zipfile import ZipFile

from defusedxml.ElementTree import fromstring  # type: ignore[import-untyped]
from openpyxl.styles.colors import COLOR_INDEX

A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
THEME_ORDER = [
    "lt1",
    "dk1",
    "lt2",
    "dk2",
    "accent1",
    "accent2",
    "accent3",
    "accent4",
    "accent5",
    "accent6",
    "hlink",
    "folHlink",
]


def theme_colors(archive: ZipFile) -> list[str]:
    if "xl/theme/theme1.xml" not in archive.namelist():
        return []
    scheme = fromstring(archive.read("xl/theme/theme1.xml")).find(
        A + "themeElements/" + A + "clrScheme"
    )
    if scheme is None:
        return []
    result = []
    for key in THEME_ORDER:
        node = scheme.find(A + key)
        item = next(iter(node), None) if node is not None else None
        result.append(item.get("lastClr", item.get("val", "")) if item is not None else "")
    return result


def display_color(node: Any, theme: list[str]) -> str | None:
    if node is None:
        return None
    rgb = node.get("rgb", "")
    if "theme" in node.attrib:
        index = int(node.attrib["theme"])
        rgb = theme[index] if 0 <= index < len(theme) else ""
    elif "indexed" in node.attrib:
        index = int(node.attrib["indexed"])
        rgb = COLOR_INDEX[index] if 0 <= index < len(COLOR_INDEX) else ""
    if not re.fullmatch(r"[0-9A-Fa-f]{6,8}", rgb):
        return None
    rgb = rgb[-6:]
    tint = max(-1.0, min(1.0, float(node.get("tint", "0"))))
    if tint:
        hue, light, saturation = colorsys.rgb_to_hls(
            *(int(rgb[i : i + 2], 16) / 255 for i in (0, 2, 4))
        )
        light = light * (1 + tint) if tint < 0 else light * (1 - tint) + tint
        rgb = "".join(f"{round(c * 255):02X}" for c in colorsys.hls_to_rgb(hue, light, saturation))
    return "#" + str(rgb).upper()
