"""Explicit formula authoring; literal cell writes never enter this path."""

import io
import posixpath
import re
from zipfile import ZIP_DEFLATED, ZipFile

from defusedxml.ElementTree import fromstring  # type: ignore[import-untyped]
from openpyxl.formula.tokenizer import Tokenizer

from app.domain.errors import ApplicationError
from app.infrastructure.spreadsheet_recalculation import safe_formula

ALIASES = {
    "СУММ": "SUM",
    "СРЗНАЧ": "AVERAGE",
    "МИН": "MIN",
    "МАКС": "MAX",
    "ЕСЛИ": "IF",
    "ЕСЛИОШИБКА": "IFERROR",
    "И": "AND",
    "ИЛИ": "OR",
    "НЕ": "NOT",
    "СЧЁТ": "COUNT",
    "СЧЕТ": "COUNT",
    "СЧЁТЗ": "COUNTA",
    "СЧЕТЗ": "COUNTA",
    "СУММЕСЛИ": "SUMIF",
    "СУММЕСЛИМН": "SUMIFS",
    "СЧЁТЕСЛИ": "COUNTIF",
    "СЧЕТЕСЛИ": "COUNTIF",
    "СЧЁТЕСЛИМН": "COUNTIFS",
    "СЧЕТЕСЛИМН": "COUNTIFS",
    "ОКРУГЛ": "ROUND",
    "ВПР": "VLOOKUP",
    "ИНДЕКС": "INDEX",
    "ПОИСКПОЗ": "MATCH",
    "ДАТА": "DATE",
    "СЕГОДНЯ": "TODAY",
}


def authored_formula(value: str, external: set[tuple[int, str]]) -> str:
    if not value.startswith("=") or not value[1:].strip() or len(value) > 4096:
        raise ApplicationError(
            "EDITOR_FORMULA_INVALID", "Enter a formula starting with = (up to 4096 characters)."
        )
    try:
        # Excel's Russian dialect uses decimal commas and semicolon arguments.
        # Never rewrite punctuation inside strings or quoted sheet names.
        parts = re.split(r"""("(?:[^"]|"")*"|'(?:[^']|'')*')""", value)
        plain = " ".join(parts[::2])
        localized = ";" in plain or any(
            re.search(r"\b" + name + r"\s*\(", plain, re.I) for name in ALIASES
        )
        if localized:
            for i in range(0, len(parts), 2):
                parts[i] = re.sub(r"(?<=\d),(?=\d)", ".", parts[i]).replace(";", ",")
        tokens = Tokenizer("".join(parts)).items
        if len(tokens) > 1024 or any(t.type == "ARRAY" for t in tokens):
            raise ValueError("Formula is too complex")
        for token in tokens:
            if token.type == "FUNC" and token.subtype == "OPEN":
                name = token.value[:-1].upper()
                token.value = ALIASES.get(name, token.value[:-1]) + "("
            if token.type == "SEP" and token.value == ";":
                token.value = ","
        normalized = "=" + "".join(t.value for t in tokens)
    except Exception as error:
        raise ApplicationError(
            "EDITOR_FORMULA_INVALID", "Check the formula syntax and its parentheses."
        ) from error
    # Mapping is only used to validate references to already cached external resources.
    safe_formula(normalized, {key: f"cache_{i}" for i, key in enumerate(sorted(external))})
    return normalized


def invalidate_formula_chain(content: bytes) -> bytes:
    """Drop obsolete dependency order, retaining unrelated OOXML bytes and precision flags."""
    output = io.BytesIO()
    with ZipFile(io.BytesIO(content)) as incoming, ZipFile(output, "w", ZIP_DEFLATED) as outgoing:
        relationships = "xl/_rels/workbook.xml.rels"
        root = fromstring(incoming.read(relationships))
        paths = {
            posixpath.normpath(posixpath.join("xl", r.get("Target", "")))
            if not r.get("Target", "").startswith("/")
            else r.get("Target", "").lstrip("/")
            for r in root
            if r.get("Type", "").endswith("/calcChain")
        }
        for entry in incoming.infolist():
            if entry.filename in paths:
                continue
            data = incoming.read(entry.filename)
            if entry.filename == relationships:
                data = re.sub(
                    rb'<(?:\w+:)?Relationship\b[^>]*\bType=["\'][^"\']*/calcChain["\'][^>]*/>',
                    b"",
                    data,
                )
            elif entry.filename == "[Content_Types].xml":
                for path in paths:
                    data = re.sub(
                        rb'<(?:\w+:)?Override\b[^>]*\bPartName=["\']/'
                        + re.escape(path.encode())
                        + rb'["\'][^>]*/>',
                        b"",
                        data,
                    )
            elif entry.filename == "xl/workbook.xml":

                def reset(match: re.Match[bytes]) -> bytes:
                    tag = re.sub(
                        rb'\s+(?:fullCalcOnLoad|forceFullCalc)=["\'][^"\']*["\']', b"", match[0]
                    )
                    return re.sub(rb"\s*/?>$", b' fullCalcOnLoad="1" forceFullCalc="1"/>', tag)

                data = re.sub(rb"<(?:\w+:)?calcPr\b[^>]*/>", reset, data)
            outgoing.writestr(entry, data)
    return output.getvalue()
