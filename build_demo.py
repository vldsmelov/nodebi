"""Package prepared values and display assets into one offline HTML file.

Each chart has labels (strings), domain [min, max], ticks [[number, label]],
and series [{label, values}], where values are numbers or null. Each table
provides a title, string headers and rows of formatted string values.
Each card has title, value and subtitle strings. Data is inserted as inert JSON.
"""

from argparse import ArgumentParser
from base64 import b64encode
from hashlib import sha256
import json
from pathlib import Path
import re

from prepare_snapshot import prepare

SOURCE = Path(__file__).resolve().parent
MAX_INPUT = 12 * 1024 * 1024
SECTIONS = {"finance", "cash", "taxes"}


def content_hash(value):
    return "'sha256-" + b64encode(sha256(value.encode("utf-8")).digest()).decode("ascii") + "'"


def render(snapshot):
    companies = snapshot["companies"]
    charts = snapshot["charts"]
    views = snapshot["views"]
    if not (isinstance(companies, list) and 1 <= len(companies) <= 9 and all(isinstance(name, str) for name in companies)):
        raise ValueError("Expected one to nine company labels")
    if not charts or any(spec["section"] not in SECTIONS or spec["kind"] not in {"bar", "line", "horizontal"} for spec in charts):
        raise ValueError("Unsupported chart display")
    if set(views) != {str(mask) for mask in range(1 << len(companies))}:
        raise ValueError("Not all company choices have a prepared view")
    for view in views.values():
        if len(view["charts"]) != len(charts):
            raise ValueError("Chart settings and prepared values do not match")
        for chart in view["charts"]:
            if chart["domain"][0] >= chart["domain"][1] or not 1 <= len(chart["series"]) <= 3:
                raise ValueError("Invalid chart domain or series count")
            if any(len(series["values"]) != len(chart["labels"]) for series in chart["series"]):
                raise ValueError("Chart values do not match labels")
    encoded = json.dumps(snapshot, ensure_ascii=False, allow_nan=False, separators=(",", ":")).replace("<", "\\u003c")
    style = (SOURCE / "report.css").read_text(encoding="utf-8")
    script = (SOURCE / "report.js").read_text(encoding="utf-8")
    if "</script" in script.lower() or "</style" in style.lower():
        raise ValueError("Invalid inline asset")
    policy = " ".join((
        "default-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none';",
        f"script-src {content_hash(script)}; style-src {content_hash(style)};",
        "connect-src 'none'; frame-src 'none'; worker-src 'none';",
    ))
    tokens = {"CSP": policy, "CSS": style, "JS": script, "SNAPSHOT": encoded}
    template = (SOURCE / "index.template.html").read_text(encoding="utf-8")
    return re.sub(r"__DEMO_(CSP|CSS|JS|SNAPSHOT)__", lambda match: tokens[match[1]], template)


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    with args.snapshot.open("rb") as source:
        raw = source.read(MAX_INPUT + 1)
    if len(raw) > MAX_INPUT:
        parser.error("snapshot is too large")
    # Preserve the exact bytes covered by CSP hashes on all operating systems.
    try:
        snapshot = json.loads(raw)
        if not isinstance(snapshot, dict):
            raise ValueError("Expected a JSON object")
        if "format" in snapshot:
            snapshot = prepare(snapshot)
        page = render(snapshot).encode("utf-8")
    except (TypeError, ValueError, KeyError, IndexError) as error:
        parser.error(f"Invalid snapshot: {error}")
    with args.output.open("xb") as output:
        output.write(page)


if __name__ == "__main__":
    main()
