import uuid
from collections.abc import Callable

import polars as pl
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.publications import ResultCatalog
from app.domain.values import ScalarValue
from app.infrastructure.storage import StorageProvider
from app.models import ReportDocument, Workflow
from app.nodes import get_node_registry
from app.schemas.reporting import CheckIssue, CheckResult, ControlValue, QualityRule, RulesRead
from app.services.execution import (
    ExecutionFailure,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)
from app.services.source_access import ProjectSourceAccess
from app.services.source_updates import state_token
from app.services.workflows import domain_graph, execution_context


def rules_read(session: Session, project_id: uuid.UUID) -> RulesRead:
    row = session.scalar(
        select(ReportDocument).where(
            ReportDocument.project_id == project_id, ReportDocument.kind == "rules"
        )
    )
    return RulesRead(
        revision=row.revision if row else 1,
        rules=[QualityRule.model_validate(item) for item in row.payload.get("rules", [])]
        if row
        else [],
    )


def check_project(
    session: Session,
    project_id: uuid.UUID,
    storage: StorageProvider,
    settings: Settings,
    sources: ProjectSourceAccess,
    result: CheckResult | None = None,
    progress: Callable[[int], None] | None = None,
) -> CheckResult:
    result = result or CheckResult(token=state_token(session, project_id))
    registry = get_node_registry()
    executor = WorkflowExecutionService(registry)
    cache = InMemoryExecutionCache()
    rules = rules_read(session, project_id).rules
    previous_document = session.scalar(
        select(ReportDocument)
        .where(
            ReportDocument.project_id == project_id,
            ReportDocument.kind == "update",
            ReportDocument.status == "applied",
        )
        .order_by(ReportDocument.updated_at.desc(), ReportDocument.created_at.desc())
    )
    previous_metrics = (
        previous_document.payload.get("check", {}).get("metrics", []) if previous_document else []
    )
    if not previous_metrics:
        for job in session.scalars(
            select(ReportDocument)
            .where(
                ReportDocument.project_id == project_id,
                ReportDocument.kind == "job",
                ReportDocument.status == "succeeded",
            )
            .order_by(ReportDocument.created_at.desc())
        ):
            if (
                job.payload.get("operation") == "check"
                and job.payload.get("check")
                and not job.payload["check"].get("issues")
            ):
                previous_metrics = job.payload["check"].get("metrics", [])
                break
    prior = {
        (metric["workflow_id"], metric["node_id"], metric["port"]): metric["value"]
        for metric in previous_metrics
    }
    workflows = session.scalars(select(Workflow).where(Workflow.project_id == project_id)).all()
    for index, workflow in enumerate(workflows):
        if progress:
            progress(int(90 * index / max(1, len(workflows))))
        try:
            graph = domain_graph(session, workflow)
            context = execution_context(
                workflow, session, storage, settings, cache, sources=sources
            )
            targets = {
                (item.node_id, item.port)
                for item in ResultCatalog.model_validate(workflow.result_catalog).outputs
            }
            targets.update((node.id, "dataset") for node in graph.nodes if node.type == "join")
            current_rules = [rule for rule in rules if rule.workflow_id == workflow.id]
            targets.update((rule.node_id, rule.port) for rule in current_rules)
            targets.update(
                (rule.other_node_id, rule.other_port)
                for rule in current_rules
                if rule.other_node_id
            )
            outputs = {}
            for node_id, port in targets:
                try:
                    executed = executor.execute(graph, node_id, context, output_port=port)
                    outputs[node_id, port] = executed
                    scalar = executed.outputs.get(port)
                    published = next(
                        (
                            item
                            for item in ResultCatalog.model_validate(
                                workflow.result_catalog
                            ).outputs
                            if item.node_id == node_id and item.port == port
                        ),
                        None,
                    )
                    if published and isinstance(scalar, ScalarValue):
                        value = (
                            float(scalar.value)
                            if isinstance(scalar.value, (int, float))
                            and not isinstance(scalar.value, bool)
                            else None
                        )
                        result.metrics.append(
                            ControlValue(
                                workflow_id=str(workflow.id),
                                node_id=str(node_id),
                                port=port,
                                name=published.name,
                                value=value,
                                previous=prior.get((str(workflow.id), str(node_id), port)),
                            )
                        )
                    diagnostics = executed.output.metadata.get("join_diagnostics")
                    if diagnostics and str(diagnostics.get("node_id")) == str(node_id):
                        # The existing join executor computes these statistics over full inputs.
                        for key in (
                            "unmatched_left_rows",
                            "unmatched_right_rows",
                            "left_duplicate_keys",
                            "right_duplicate_keys",
                            "additional_rows",
                        ):
                            count = diagnostics.get(key, 0)
                            if count:
                                result.issues.append(
                                    CheckIssue(
                                        severity="warning",
                                        message=f"Join: {key}",
                                        workflow_id=str(workflow.id),
                                        node_id=str(node_id),
                                        count=count,
                                    )
                                )
                except (ExecutionFailure, ApplicationError, ValueError) as exc:
                    result.issues.append(
                        CheckIssue(
                            severity="error",
                            message=str(exc),
                            workflow_id=str(workflow.id),
                            node_id=str(node_id),
                        )
                    )
            for rule in current_rules:
                try:
                    output = outputs.get((rule.node_id, rule.port))
                    if output is None:
                        continue
                    frame = output.output.frame
                    names = [output.schema.by_id(identity).engine_name for identity in rule.columns]
                    if rule.kind in {"required", "unique"}:
                        if not names:
                            raise ValueError("Choose fields for the quality rule.")
                        if rule.kind == "required":
                            invalid = frame.filter(
                                pl.any_horizontal([pl.col(name).is_null() for name in names])
                            )
                        else:
                            invalid = frame.filter(frame.select(names).is_duplicated())
                        if invalid.height:
                            result.issues.append(
                                CheckIssue(
                                    severity=rule.severity,
                                    message=rule.name,
                                    count=invalid.height,
                                    workflow_id=str(workflow.id),
                                    node_id=str(rule.node_id),
                                    examples=invalid.head(20).to_dicts(),
                                )
                            )
                    else:
                        publications = ResultCatalog.model_validate(workflow.result_catalog).outputs
                        required = {(rule.node_id, rule.port)}
                        if rule.kind == "compare":
                            if rule.other_node_id is None:
                                raise ValueError("Choose the other published scalar output.")
                            required.add((rule.other_node_id, rule.other_port))
                        if not required.issubset(
                            {(p.node_id, p.port) for p in publications if p.kind == "scalar"}
                        ):
                            raise ValueError("Comparison requires published scalar outputs.")
                        other = (
                            outputs.get((rule.other_node_id, rule.other_port))
                            if rule.other_node_id
                            else None
                        )
                        first = output.outputs.get(rule.port)
                        if (
                            not isinstance(first, ScalarValue)
                            or isinstance(first.value, bool)
                            or not isinstance(first.value, (int, float))
                        ):
                            raise ValueError(
                                "Comparison requires a numeric value, not an empty result."
                            )
                        second = other.outputs.get(rule.other_port) if other else None
                        if rule.kind == "change":
                            before = prior.get((str(workflow.id), str(rule.node_id), rule.port))
                            if before is None:
                                result.issues.append(
                                    CheckIssue(
                                        severity="warning",
                                        message=(
                                            "Previous control value is unavailable. "
                                            "This check establishes a baseline."
                                        ),
                                        workflow_id=str(workflow.id),
                                        node_id=str(rule.node_id),
                                    )
                                )
                                continue
                            second = ScalarValue(before)
                        if not isinstance(first, ScalarValue) or not isinstance(
                            second, ScalarValue
                        ):
                            raise ValueError(
                                "Comparison requires two published numeric scalar outputs."
                            )
                        if (
                            isinstance(second.value, bool)
                            or not isinstance(first.value, (int, float))
                            or not isinstance(second.value, (int, float))
                        ):
                            raise ValueError(
                                "Comparison requires two numeric values, not empty results."
                            )
                        if abs(float(first.value) - float(second.value)) > rule.tolerance:
                            result.issues.append(
                                CheckIssue(
                                    severity=rule.severity,
                                    message=rule.name,
                                    workflow_id=str(workflow.id),
                                    node_id=str(rule.node_id),
                                )
                            )
                except (ValueError, StopIteration) as exc:
                    result.issues.append(
                        CheckIssue(
                            severity="error",
                            message=str(exc) or "Quality rule field is unavailable.",
                            workflow_id=str(workflow.id),
                            node_id=str(rule.node_id),
                        )
                    )
        except (ValueError, ApplicationError) as exc:
            result.issues.append(
                CheckIssue(severity="error", message=str(exc), workflow_id=str(workflow.id))
            )
    known = {workflow.id for workflow in workflows}
    for rule in rules:
        if rule.workflow_id not in known:
            result.issues.append(
                CheckIssue(
                    severity="error", message=f"Quality rule workflow is unavailable: {rule.name}"
                )
            )
    return result
