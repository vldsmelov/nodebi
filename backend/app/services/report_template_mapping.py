"""Project report settings into input roles and fresh output identities, never compute data."""

import io
import keyword
import re
import tokenize
import uuid
from collections.abc import Callable

from app.domain.datasets import DatasetSchema
from app.domain.errors import ApplicationError
from app.domain.formulas import parse_formula
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.nodes.exact_calculated_column import ExactCalculatedColumnExecutor
from app.nodes.exact_group_by import ExactGroupByExecutor
from app.nodes.stable_group_by import StableGroupByExecutor
from app.schemas.report_builder import ReportSettings
from app.services.report_formulas import aggregation_config


def canonical_expression(expression: str, schema: DatasetSchema) -> str:
    """Convert engine-name aliases to stable references without changing numeric/literal tokens."""
    _, normalized, aliases = parse_formula(expression, schema)
    names = {c.engine_name: c.column_id for c in schema.columns}
    names.update({key: column.column_id for key, column in aliases.items()})
    tokens = list(tokenize.generate_tokens(io.StringIO(normalized).readline))
    result = []
    for index, token in enumerate(tokens):
        text = token.string
        if token.type == tokenize.NAME and text in names and not keyword.iskeyword(text):
            # A function's name is not a field, even when a column has the same name.
            following = tokens[index + 1].string if index + 1 < len(tokens) else ""
            if following != "(":
                text = f"[{names[text]}]"
        result.append((token.type, text))
    return tokenize.untokenize(result).strip()


def canonical_settings(
    settings: ReportSettings, schema: DatasetSchema, aggregate_id: uuid.UUID
) -> ReportSettings:
    """Use the existing executors' schema inference for each original formula scope."""
    payload = settings.model_dump(mode="json")
    context = ExecutionContext(aggregate_id, aggregate_id, aggregate_id)
    executor = ExactCalculatedColumnExecutor()
    for key in ("row_formulas", "summary_formulas"):
        if key == "summary_formulas":
            stable = settings.measures[0].output_id is not None
            group = NodeInstance(
                aggregate_id,
                "group_by",
                3 if stable else 2,
                Position(0, 0),
                aggregation_config(settings),
                {},
            )
            schema = (StableGroupByExecutor() if stable else ExactGroupByExecutor()).infer_schema(
                group, {"input": schema}, context
            )
        for formula in payload[key]:
            node = NodeInstance(
                uuid.UUID(formula["node_id"]),
                "calculated_column",
                2,
                Position(0, 0),
                {k: v for k, v in formula.items() if k != "node_id"},
                {},
            )
            output = executor.infer_schema(node, {"input": schema}, context)
            formula["expression"] = canonical_expression(formula["expression"], schema)
            schema = output
    return ReportSettings.model_validate(payload)


def rewrite_expression(expression: str, field: Callable[[str], str]) -> str:
    """Canonical bracket fields only; quoted condition values are never remapped."""

    # Same quoted-string/bracket grammar as parse_formula; do not replace arbitrary substrings.
    def replace(match: re.Match[str]) -> str:
        return f"[{field(match.group(1))}]" if match.group(1) is not None else match.group(0)

    return re.sub(r""""(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\[([^\[\]]+)\]""", replace, expression)


def rebind_report_settings(
    settings: ReportSettings,
    mapping: dict[str, str],
    namespace: uuid.UUID,
    legacy_aggregate_id: uuid.UUID | None = None,
) -> tuple[ReportSettings, set[str]]:
    """Remap only structural roles, never names, filter values or numeric scale bounds."""
    payload = settings.model_dump(mode="json")
    derived: dict[str, str] = {}
    for key in ("row_formulas", "summary_formulas"):
        for formula in payload[key]:
            old = uuid.UUID(formula["node_id"])
            new = uuid.uuid5(namespace, f"formula:{old}")
            derived[f"calc_{old.hex}"] = f"calc_{new.hex}"
            formula["node_id"] = str(new)
    for index, measure in enumerate(payload["measures"]):
        output_id = uuid.UUID(measure["output_id"]) if measure["output_id"] else None
        if output_id is not None:
            old_field = f"measure_{output_id.hex}"
        elif legacy_aggregate_id is not None:
            old_field = f"agg_{legacy_aggregate_id.hex}_{index}"
        else:
            raise ApplicationError(
                "INVALID_TEMPLATE", "The report measure identity is unavailable."
            )
        new = uuid.uuid5(namespace, f"measure:{output_id or f'legacy:{index}'}")
        derived[old_field] = f"measure_{new.hex}"
        measure["output_id"] = str(new)
    if set(derived) & mapping.keys():
        raise ApplicationError("INVALID_TEMPLATE", "Input and calculated field identities overlap.")
    used: set[str] = set()

    def field(identity: str) -> str:
        if identity in derived:
            return derived[identity]
        if identity not in mapping:
            raise ApplicationError(
                "INVALID_TEMPLATE", "A referenced template field is unavailable."
            )
        used.add(identity)
        return mapping[identity]

    payload["dimensions"] = [field(identity) for identity in settings.dimensions]
    for measure in payload["measures"]:
        if measure["column_id"] is not None:
            measure["column_id"] = field(measure["column_id"])
    for condition in payload["filters"]:
        condition["column_id"] = field(condition["column_id"])
    for key in ("row_formulas", "summary_formulas"):
        for formula in payload[key]:
            formula["expression"] = rewrite_expression(formula["expression"], field)
    if payload["value_field_id"] is not None:
        payload["value_field_id"] = field(payload["value_field_id"])
    if payload["comparison"]:
        for key in ("date_column_id", "value_column_id"):
            payload["comparison"][key] = field(payload["comparison"][key])
    if payload.get("combo"):
        payload["combo"]["category_column_id"] = field(payload["combo"]["category_column_id"])
        for series in payload["combo"]["series"]:
            series["column_id"] = field(series["column_id"])
    if payload.get("radar"):
        payload["radar"]["profile_column_id"] = field(payload["radar"]["profile_column_id"])
        for axis in payload["radar"]["axes"]:
            axis["column_id"] = field(axis["column_id"])
    return ReportSettings.model_validate(payload), used
