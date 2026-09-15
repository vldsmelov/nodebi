"""Export an independent local test oracle; run with the reference's dependencies.

This is test tooling, never imported by the Node BI application. Workbooks and output
must remain outside Git. No Node BI calculation implementation is used here.
"""

import argparse
import importlib
import json
import subprocess
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("repository", type=Path)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    revision = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=args.repository, text=True
    ).strip()
    if revision != "48ef6b0d2bfd4201b5ef6744ec1585739b3b8eec":
        raise ValueError("Reference checkout must match the reviewed v1.2 revision.")
    sys.path.insert(0, str(args.repository.resolve()))
    loader = importlib.import_module("data_loader")
    builder = importlib.import_module("dashboard_builder")
    dataset = loader.load_calculation_services_dataset(args.workbook.resolve())
    navigation = builder.build_navigation_data(dataset)
    expected = {
        "reference_revision": revision,
        "overview": builder.build_dashboard_data(dataset),
        "navigation": {key: navigation[key] for key in ("totals", "class_rows", "services")},
    }
    args.output.write_text(json.dumps(expected, ensure_ascii=False), encoding="utf-8")
    print(f"Reference export complete: {len(dataset['services'])} services.")


if __name__ == "__main__":
    main()
