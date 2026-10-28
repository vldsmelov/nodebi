"""Keep exact numeric input XML when plain worksheets are rewritten or rows move."""

from collections.abc import Callable
from decimal import Decimal
from typing import Any

from openpyxl.utils.cell import coordinate_to_tuple

from app.domain.ingestion import ImportProfile
from app.infrastructure.workbook_cells import NS, WorkbookCells, address


def table_positions(rows: int, profile: ImportProfile, state: dict[str, Any]) -> dict[str, int]:
    identities = [f"r:{i}" for i in range(rows)] + state.get("added", [])
    deleted = set(state.get("deleted", []))
    visible = [identity for identity in identities if identity not in deleted]
    return {identity: profile.options.header_row + i for i, identity in enumerate(visible)}


def preserve_numbers(
    original: WorkbookCells,
    rendered: bytes,
    profiles: list[ImportProfile],
    states: dict[str, Any],
    counts: dict[str, int],
    convert: Callable[[ImportProfile, int, str], Any],
) -> bytes:
    """No float round-trip for original values or explicitly typed integer/decimal edits."""
    result = WorkbookCells(rendered)
    replacements: dict[str, dict[str, tuple[str, str, bool]]] = {}
    by_sheet = {p.resource_id: p for p in profiles}
    for name, sheet in original.sheets.items():
        profile = by_sheet.get(name)
        state = states.get(name, {})
        positions = table_positions(counts[name], profile, state) if profile else None
        changes: dict[str, tuple[str, str, bool]] = {}
        for coordinate, cell in sheet.cells.items():
            if cell.get("t", "n") not in {"n", "b"} or cell.find(NS + "f") is not None:
                continue
            value = cell.findtext(NS + "v")
            if value is None:
                continue
            row, column = coordinate_to_tuple(coordinate)
            if profile and row > profile.options.header_row:
                identity = f"r:{row - profile.options.header_row - 1}"
                if positions is None or identity not in positions:
                    continue
                if str(column - 1) in state.get("cells", {}).get(identity, {}):
                    continue
                coordinate = address(positions[identity], column - 1)
            changes[coordinate] = (cell.get("t", "n"), value, False)
        if profile and positions is not None:
            for identity, columns in state.get("cells", {}).items():
                if identity not in positions:
                    continue
                for column, text in columns.items():
                    value = convert(profile, int(column), text)
                    coordinate = address(positions[identity], int(column))
                    if isinstance(value, bool):
                        changes[coordinate] = ("b", "1" if value else "0", False)
                    elif isinstance(value, (int, float, Decimal)):
                        changes[coordinate] = ("n", str(value), False)
        if changes:
            replacements[result.sheets[name].path] = changes
    return result.patched(replacements) if replacements else rendered
