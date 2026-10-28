"""Report authoring compiles versioned nodes; schemas still come from the common engine."""

import uuid
from typing import Any

from pydantic import BaseModel

from app.domain.errors import ApplicationError
from app.domain.nodes import ExecutionContext
from app.models import Workflow
from app.nodes import get_node_registry
from app.schemas.report_builder import ReportFormula, ReportFormulaFields, ReportSettings
from app.schemas.workflows import NodePayload, PositionPayload, ResolvedColumnRead, WorkflowSave
from app.services.execution import ExecutionPlanner
from app.services.workflow_validation import WorkflowSchemaResolver


def receipt_payload(request: BaseModel) -> dict[str, Any]:
    """Keep hashes of pre-formula request receipts valid after this additive API extension."""
    payload = request.model_dump(mode="json")
    if payload.get("published_input") is None:
        payload.pop("published_input", None)
    settings = payload.get("settings", payload)
    for key in ("row_formulas", "summary_formulas", "value_field_id", "comparison"):
        if not settings.get(key):
            settings.pop(key, None)
    for measure in settings["measures"]:
        if measure.get("output_id") is None:
            measure.pop("output_id", None)
    return payload


def formula_node(formula: ReportFormula, scope: str, x: float) -> NodePayload:
    return NodePayload(
        id=formula.node_id,
        type="calculated_column",
        version=2,
        position=PositionPayload(x=x, y=80),
        config=formula.model_dump(mode="json", exclude={"node_id"}),
        ui={"report_formula": scope},
    )


def aggregation_config(settings: ReportSettings) -> dict[str, Any]:
    return {
        "dimensions": settings.dimensions,
        "aggregations": [
            m.model_dump(mode="json", exclude={"output_id"} if m.output_id is None else set())
            for m in settings.measures
        ],
        "decimal_average_scale": settings.decimal_average_scale,
    }


def formula_fields(
    payload: WorkflowSave,
    workflow: Workflow,
    context: ExecutionContext,
    aggregate_id: uuid.UUID | None = None,
    summary_ids: list[uuid.UUID] | None = None,
) -> ReportFormulaFields:
    from app.services.report_projection import as_graph

    aggregates = [n for n in payload.nodes if n.type == "group_by"]
    # The report terminal points to this aggregation when summary formulas are stripped.
    terminal = aggregate_id or (
        payload.result_catalog.outputs[0].node_id if payload.result_catalog else None
    )
    aggregate = next((n for n in aggregates if n.id == terminal), None)
    if aggregate is None:
        raise ApplicationError("INVALID_REPORT", "The report aggregation is unavailable.")
    graph = (
        ExecutionPlanner(get_node_registry())
        .plan(
            as_graph(payload, workflow.id, workflow.project_id),
            summary_ids[-1] if summary_ids else aggregate.id,
        )
        .graph
    )
    resolved = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    errors = [issue for issue in resolved.issues if issue.severity == "error"]
    if errors:
        raise ApplicationError("INVALID_REPORT", errors[0].message)

    def columns(identity: uuid.UUID, port: str = "dataset") -> list[ResolvedColumnRead]:
        node = next(n for n in resolved.nodes if n.node_id == identity)
        table = node.outputs[port].table
        if table is None:
            raise ApplicationError("INVALID_REPORT", "The report table schema is unavailable.")
        return [ResolvedColumnRead(**c.to_dict()) for c in table.columns]

    incoming = next(e for e in graph.edges if e.target_node_id == aggregate.id)
    return ReportFormulaFields(
        row_columns=columns(incoming.source_node_id, incoming.source_port),
        measure_columns=columns(aggregate.id)[len(aggregate.config.get("dimensions", [])) :],
        row_outputs={
            str(n.id): columns(n.id)
            for n in payload.nodes
            if n.ui.get("report_formula") == "row"
            and any(v.node_id == n.id for v in resolved.nodes)
        },
        summary_outputs={
            str(identity): columns(identity)[len(aggregate.config.get("dimensions", [])) :]
            for identity in summary_ids or []
        },
    )
