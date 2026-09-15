"""Export an independent local test oracle; run with the reference's dependencies.

This is test tooling, never imported by the Node BI application. Workbooks and output
must remain outside Git. No Node BI calculation implementation is used here.
"""

import argparse
import ast
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
    subprocess.run(["git", "diff", "--exit-code", "HEAD", "--", "app.py", "data_loader.py", "dashboard_builder.py", "utils.py"], cwd=args.repository, check=True, stdout=subprocess.DEVNULL)
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
    # Run the pinned original route bodies without importing its auth/server/file registry.
    # This trusted-code extraction belongs only to the independent test oracle.
    from fastapi import HTTPException, Query

    route_names = {"get_class_or_404", "get_service_or_404", "dashboard_class",
                   "dashboard_service", "dashboard_cost_overview", "dashboard_cost_class",
                   "dashboard_cost_detail"}
    parsed = ast.parse((args.repository / "app.py").read_text(encoding="utf-8"))
    functions = [node for node in parsed.body if isinstance(node, ast.FunctionDef) and node.name in route_names]
    if {node.name for node in functions} != route_names:
        raise ValueError("Original route set changed.")
    for node in functions:
        node.decorator_list = []
    def fail(_request, message):
        raise RuntimeError(message)
    namespace = {
        "Request": object, "HTTPException": HTTPException, "Query": Query,
        "COST_TYPE_META": builder.COST_TYPE_META,
        "build_cost_scope_data": builder.build_cost_scope_data,
        "get_cost_meta_or_404": builder.get_cost_meta_or_404,
        "load_active_dashboard_payload": lambda _request: (dataset, expected["overview"], navigation),
        "template_url_for": lambda _request: lambda route, **_values: route,
        "templated": lambda _request, _template, context: context,
        "render_dashboard_error": fail,
    }
    exec(compile(ast.Module(body=functions, type_ignores=[]), "original_reference_routes", "exec"), namespace)
    def context(route, **values):
        result = namespace[route](None, **values)
        return {key: value for key, value in result.items() if key not in {"overview", "navigation", "breadcrumbs"}}
    expected["screens"] = {
        "class": [context("dashboard_class", class_name=row["name"]) for row in navigation["class_rows"]],
        "service": [context("dashboard_service", class_name=row["class_name"], service_name=row["service_name"]) for row in navigation["services"]],
        "cost": [context("dashboard_cost_overview", cost_key=key) for key in builder.COST_TYPE_META],
        "cost_class": [context("dashboard_cost_class", cost_key=key, class_name=row["name"]) for key in builder.COST_TYPE_META for row in navigation["class_rows"]],
        "cost_service": [context("dashboard_cost_detail", cost_key=key, class_name=row["class_name"], service_name=row["service_name"], source=None) for key in builder.COST_TYPE_META for row in navigation["services"]],
    }
    args.output.write_text(json.dumps(expected, ensure_ascii=False), encoding="utf-8")
    print(f"Reference export complete: {len(dataset['services'])} services.")


if __name__ == "__main__":
    main()
